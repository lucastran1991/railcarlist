package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"railcarlist/internal/config"
	"railcarlist/internal/database"
	"railcarlist/internal/handlers"
	"railcarlist/internal/services"

	"github.com/gorilla/mux"
)

func main() {
	configPath := flag.String("config", "config.json", "Path to config file")
	dbPath := flag.String("db", "", "Path to SQLite database file (overrides config)")
	port := flag.String("port", "", "Server port (overrides config)")
	flag.Parse()

	cfg, err := config.LoadConfigWithDefaults(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if *dbPath != "" {
		cfg.Database.Path = *dbPath
	}
	if *port != "" {
		cfg.Server.Port = *port
	}

	// Initialize multi-tenant DB manager (one DB per terminal)
	dbMgr, err := database.NewDBManager(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize databases: %v", err)
	}
	defer dbMgr.CloseAll()

	log.Printf("Databases initialized for terminals: %v", database.Terminals)

	// Default DB for legacy (non-tenant) endpoints
	db := dbMgr.Default()

	// Legacy services (use default DB)
	loader := services.NewLoader(db)
	queryService := services.NewQueryService(db)
	generator := services.NewGenerator(db)
	uploadService := services.NewUploadService(db)
	tagsService := services.NewTagsService(db)
	railcarService := services.NewRailcarService(db)

	minValue, maxValue, useSequential, startTime, endTime := cfg.GenerationDefaults()

	// Legacy handlers
	loadHandler := handlers.NewLoadHandler(loader, cfg.Data.RawDataFolder)
	queryHandler := handlers.NewQueryHandler(queryService)
	generatorHandler := handlers.NewGeneratorHandler(generator, minValue, maxValue, useSequential, startTime, endTime)
	configHandler := handlers.NewConfigHandler(minValue, maxValue, cfg.Server.Port, cfg.Frontend.ApiBaseURL)
	uploadHandler := handlers.NewUploadHandler(uploadService)
	tagsHandler := handlers.NewTagsHandler(tagsService)
	railcarHandler := handlers.NewRailcarHandler(railcarService)

	// Multi-tenant handler (resolves DB per request via X-Terminal-Id header)
	mt := handlers.NewMultiTenantHandler(dbMgr)

	// --- Legacy single-tenant handlers for domain detail pages ---
	// These use default DB; kept for backward compatibility with detail endpoints
	electricityHandler := handlers.NewElectricityHandler(services.NewElectricityService(db))
	steamHandler := handlers.NewSteamHandler(services.NewSteamService(db))
	boilerHandler := handlers.NewBoilerHandler(services.NewBoilerService(db))
	tankHandler := handlers.NewTankHandler(services.NewTankService(db))
	subStationHandler := handlers.NewSubStationHandler(services.NewSubStationService(db))

	// Router
	router := mux.NewRouter()
	router.HandleFunc("/api/railcars/all", railcarHandler.HandleDeleteAll).Methods("DELETE")

	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/config", configHandler.Handle).Methods("GET")
	api.HandleFunc("/load", loadHandler.Handle).Methods("POST")
	api.HandleFunc("/generate-dummy", generatorHandler.Handle).Methods("POST")
	api.HandleFunc("/upload-csv", uploadHandler.Handle).Methods("POST")
	api.HandleFunc("/tags/names", tagsHandler.HandleListNames).Methods("GET")
	api.HandleFunc("/tags", tagsHandler.HandleGet).Methods("GET")
	api.HandleFunc("/tags", tagsHandler.HandleDelete).Methods("DELETE")
	api.HandleFunc("/tags", tagsHandler.HandlePost).Methods("POST")
	api.HandleFunc("/railcars/import/savana", railcarHandler.HandleImportSavana).Methods("POST")
	api.HandleFunc("/railcars/import", railcarHandler.HandleImport).Methods("POST")
	api.HandleFunc("/railcars/{id}", railcarHandler.HandleGet).Methods("GET")
	api.HandleFunc("/railcars/{id}", railcarHandler.HandleUpdate).Methods("PUT")
	api.HandleFunc("/railcars/{id}", railcarHandler.HandleDelete).Methods("DELETE")
	api.HandleFunc("/railcars", railcarHandler.HandleList).Methods("GET")
	api.HandleFunc("/railcars", railcarHandler.HandleCreate).Methods("POST")

	// === Multi-tenant KPI routes (resolve DB via X-Terminal-Id header) ===
	api.HandleFunc("/electricity/kpis", mt.ElectricityKPIs).Methods("GET")
	api.HandleFunc("/substation/kpis", mt.SubStationKPIs).Methods("GET")
	api.HandleFunc("/boiler/kpis", mt.BoilerKPIs).Methods("GET")
	api.HandleFunc("/steam/kpis", mt.SteamKPIs).Methods("GET")
	api.HandleFunc("/tank/kpis", mt.TankKPIs).Methods("GET")
	api.HandleFunc("/tank/levels", mt.TankLevels).Methods("GET")
	api.HandleFunc("/alerts", mt.Alerts).Methods("GET")
	api.HandleFunc("/alerts/kpis", mt.AlertKPIs).Methods("GET")
	api.HandleFunc("/pipeline/dag", mt.PipelineDAG).Methods("GET")

	// === Multi-tenant data generation (generates all terminals at once) ===
	api.HandleFunc("/system/generate", mt.GenerateAll).Methods("POST")

	// === Legacy detail endpoints (use default DB for now) ===
	api.HandleFunc("/electricity/load-profiles", electricityHandler.HandleGetLoadProfiles).Methods("GET")
	api.HandleFunc("/electricity/weekly-consumption", electricityHandler.HandleGetWeeklyConsumption).Methods("GET")
	api.HandleFunc("/electricity/power-factor", electricityHandler.HandleGetPowerFactor).Methods("GET")
	api.HandleFunc("/electricity/cost-breakdown", electricityHandler.HandleGetCostBreakdown).Methods("GET")
	api.HandleFunc("/electricity/peak-demand", electricityHandler.HandleGetPeakDemand).Methods("GET")
	api.HandleFunc("/electricity/phase-balance", electricityHandler.HandleGetPhaseBalance).Methods("GET")
	api.HandleFunc("/electricity/ingest", electricityHandler.HandleIngest).Methods("POST")
	api.HandleFunc("/steam/balance", steamHandler.HandleGetBalance).Methods("GET")
	api.HandleFunc("/steam/header-pressure", steamHandler.HandleGetHeaderPressure).Methods("GET")
	api.HandleFunc("/steam/distribution", steamHandler.HandleGetDistribution).Methods("GET")
	api.HandleFunc("/steam/condensate", steamHandler.HandleGetCondensate).Methods("GET")
	api.HandleFunc("/steam/fuel-ratio", steamHandler.HandleGetFuelRatio).Methods("GET")
	api.HandleFunc("/steam/loss", steamHandler.HandleGetLoss).Methods("GET")
	api.HandleFunc("/steam/ingest", steamHandler.HandleIngest).Methods("POST")
	api.HandleFunc("/boiler/readings", boilerHandler.HandleGetReadings).Methods("GET")
	api.HandleFunc("/boiler/efficiency-trend", boilerHandler.HandleGetEfficiencyTrend).Methods("GET")
	api.HandleFunc("/boiler/combustion", boilerHandler.HandleGetCombustion).Methods("GET")
	api.HandleFunc("/boiler/steam-fuel", boilerHandler.HandleGetSteamFuel).Methods("GET")
	api.HandleFunc("/boiler/emissions", boilerHandler.HandleGetEmissions).Methods("GET")
	api.HandleFunc("/boiler/stack-temp", boilerHandler.HandleGetStackTemp).Methods("GET")
	api.HandleFunc("/boiler/ingest", boilerHandler.HandleIngest).Methods("POST")
	api.HandleFunc("/tank/inventory-trend", tankHandler.HandleGetInventoryTrend).Methods("GET")
	api.HandleFunc("/tank/throughput", tankHandler.HandleGetThroughput).Methods("GET")
	api.HandleFunc("/tank/product-distribution", tankHandler.HandleGetProductDistribution).Methods("GET")
	api.HandleFunc("/tank/level-changes", tankHandler.HandleGetLevelChanges).Methods("GET")
	api.HandleFunc("/tank/temperatures", tankHandler.HandleGetTemperatures).Methods("GET")
	api.HandleFunc("/tank/ingest", tankHandler.HandleIngest).Methods("POST")
	api.HandleFunc("/substation/voltage-profile", subStationHandler.HandleGetVoltageProfile).Methods("GET")
	api.HandleFunc("/substation/transformers", subStationHandler.HandleGetTransformers).Methods("GET")
	api.HandleFunc("/substation/harmonics", subStationHandler.HandleGetHarmonics).Methods("GET")
	api.HandleFunc("/substation/transformer-temp", subStationHandler.HandleGetTransformerTemp).Methods("GET")
	api.HandleFunc("/substation/feeder-distribution", subStationHandler.HandleGetFeederDistribution).Methods("GET")
	api.HandleFunc("/substation/fault-events", subStationHandler.HandleGetFaultEvents).Methods("GET")
	api.HandleFunc("/substation/ingest", subStationHandler.HandleIngest).Methods("POST")
	api.PathPrefix("/timeseriesdata/").HandlerFunc(queryHandler.Handle).Methods("GET")

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	}).Methods("GET")

	// CORS
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Terminal-Id")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	log.Printf("Multi-tenant terminals: %v", database.Terminals)
	log.Printf("POST /api/system/generate — generates data for ALL terminals")

	if err := http.ListenAndServe(addr, corsMiddleware(router)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
