package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"railcarlist/internal/auth"
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

	// Default DB for legacy non-domain endpoints
	db := dbMgr.Default()

	// Legacy services (non-domain, use default DB)
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

	// Auth
	tokenCfg := auth.DefaultTokenConfig()
	authHandler := auth.NewHandler(db, tokenCfg)
	auth.SeedUsers(db)

	// Multi-tenant handler
	mt := handlers.NewMultiTenantHandler(dbMgr)

	// Router
	router := mux.NewRouter()
	router.HandleFunc("/api/railcars/all", railcarHandler.HandleDeleteAll).Methods("DELETE")

	api := router.PathPrefix("/api").Subrouter()

	// --- Public auth endpoints (no middleware) ---
	api.HandleFunc("/auth/login", authHandler.Login).Methods("POST")
	api.HandleFunc("/auth/refresh", authHandler.RefreshToken).Methods("POST")

	// --- Protected: /auth/me ---
	api.Handle("/auth/me", auth.Middleware(tokenCfg.Secret)(http.HandlerFunc(authHandler.Me))).Methods("GET")

	// --- Non-domain endpoints (default DB) ---
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
	api.PathPrefix("/timeseriesdata/").HandlerFunc(queryHandler.Handle).Methods("GET")

	// --- Multi-tenant: ALL domain endpoints resolve DB via X-Terminal-Id ---

	// Electricity
	api.HandleFunc("/electricity/kpis", mt.Electricity((*handlers.ElectricityHandler).HandleGetKPIs)).Methods("GET")
	api.HandleFunc("/electricity/load-profiles", mt.Electricity((*handlers.ElectricityHandler).HandleGetLoadProfiles)).Methods("GET")
	api.HandleFunc("/electricity/weekly-consumption", mt.Electricity((*handlers.ElectricityHandler).HandleGetWeeklyConsumption)).Methods("GET")
	api.HandleFunc("/electricity/power-factor", mt.Electricity((*handlers.ElectricityHandler).HandleGetPowerFactor)).Methods("GET")
	api.HandleFunc("/electricity/cost-breakdown", mt.Electricity((*handlers.ElectricityHandler).HandleGetCostBreakdown)).Methods("GET")
	api.HandleFunc("/electricity/peak-demand", mt.Electricity((*handlers.ElectricityHandler).HandleGetPeakDemand)).Methods("GET")
	api.HandleFunc("/electricity/phase-balance", mt.Electricity((*handlers.ElectricityHandler).HandleGetPhaseBalance)).Methods("GET")
	api.HandleFunc("/electricity/ingest", mt.Electricity((*handlers.ElectricityHandler).HandleIngest)).Methods("POST")

	// Steam
	api.HandleFunc("/steam/kpis", mt.Steam((*handlers.SteamHandler).HandleGetKPIs)).Methods("GET")
	api.HandleFunc("/steam/balance", mt.Steam((*handlers.SteamHandler).HandleGetBalance)).Methods("GET")
	api.HandleFunc("/steam/header-pressure", mt.Steam((*handlers.SteamHandler).HandleGetHeaderPressure)).Methods("GET")
	api.HandleFunc("/steam/distribution", mt.Steam((*handlers.SteamHandler).HandleGetDistribution)).Methods("GET")
	api.HandleFunc("/steam/condensate", mt.Steam((*handlers.SteamHandler).HandleGetCondensate)).Methods("GET")
	api.HandleFunc("/steam/fuel-ratio", mt.Steam((*handlers.SteamHandler).HandleGetFuelRatio)).Methods("GET")
	api.HandleFunc("/steam/loss", mt.Steam((*handlers.SteamHandler).HandleGetLoss)).Methods("GET")
	api.HandleFunc("/steam/ingest", mt.Steam((*handlers.SteamHandler).HandleIngest)).Methods("POST")

	// Boiler
	api.HandleFunc("/boiler/kpis", mt.Boiler((*handlers.BoilerHandler).HandleGetKPIs)).Methods("GET")
	api.HandleFunc("/boiler/readings", mt.Boiler((*handlers.BoilerHandler).HandleGetReadings)).Methods("GET")
	api.HandleFunc("/boiler/efficiency-trend", mt.Boiler((*handlers.BoilerHandler).HandleGetEfficiencyTrend)).Methods("GET")
	api.HandleFunc("/boiler/combustion", mt.Boiler((*handlers.BoilerHandler).HandleGetCombustion)).Methods("GET")
	api.HandleFunc("/boiler/steam-fuel", mt.Boiler((*handlers.BoilerHandler).HandleGetSteamFuel)).Methods("GET")
	api.HandleFunc("/boiler/emissions", mt.Boiler((*handlers.BoilerHandler).HandleGetEmissions)).Methods("GET")
	api.HandleFunc("/boiler/stack-temp", mt.Boiler((*handlers.BoilerHandler).HandleGetStackTemp)).Methods("GET")
	api.HandleFunc("/boiler/ingest", mt.Boiler((*handlers.BoilerHandler).HandleIngest)).Methods("POST")

	// Tank
	api.HandleFunc("/tank/kpis", mt.Tank((*handlers.TankHandler).HandleGetKPIs)).Methods("GET")
	api.HandleFunc("/tank/levels", mt.Tank((*handlers.TankHandler).HandleGetLevels)).Methods("GET")
	api.HandleFunc("/tank/inventory-trend", mt.Tank((*handlers.TankHandler).HandleGetInventoryTrend)).Methods("GET")
	api.HandleFunc("/tank/throughput", mt.Tank((*handlers.TankHandler).HandleGetThroughput)).Methods("GET")
	api.HandleFunc("/tank/product-distribution", mt.Tank((*handlers.TankHandler).HandleGetProductDistribution)).Methods("GET")
	api.HandleFunc("/tank/level-changes", mt.Tank((*handlers.TankHandler).HandleGetLevelChanges)).Methods("GET")
	api.HandleFunc("/tank/temperatures", mt.Tank((*handlers.TankHandler).HandleGetTemperatures)).Methods("GET")
	api.HandleFunc("/tank/ingest", mt.Tank((*handlers.TankHandler).HandleIngest)).Methods("POST")

	// SubStation
	api.HandleFunc("/substation/kpis", mt.SubStation((*handlers.SubStationHandler).HandleGetKPIs)).Methods("GET")
	api.HandleFunc("/substation/voltage-profile", mt.SubStation((*handlers.SubStationHandler).HandleGetVoltageProfile)).Methods("GET")
	api.HandleFunc("/substation/transformers", mt.SubStation((*handlers.SubStationHandler).HandleGetTransformers)).Methods("GET")
	api.HandleFunc("/substation/harmonics", mt.SubStation((*handlers.SubStationHandler).HandleGetHarmonics)).Methods("GET")
	api.HandleFunc("/substation/transformer-temp", mt.SubStation((*handlers.SubStationHandler).HandleGetTransformerTemp)).Methods("GET")
	api.HandleFunc("/substation/feeder-distribution", mt.SubStation((*handlers.SubStationHandler).HandleGetFeederDistribution)).Methods("GET")
	api.HandleFunc("/substation/fault-events", mt.SubStation((*handlers.SubStationHandler).HandleGetFaultEvents)).Methods("GET")
	api.HandleFunc("/substation/ingest", mt.SubStation((*handlers.SubStationHandler).HandleIngest)).Methods("POST")

	// Alerts
	api.HandleFunc("/alerts", mt.Alert((*handlers.AlertHandler).HandleList)).Methods("GET")
	api.HandleFunc("/alerts/kpis", mt.Alert((*handlers.AlertHandler).HandleGetKPIs)).Methods("GET")

	// Pipeline DAG
	api.HandleFunc("/pipeline/dag", mt.PipelineDAG).Methods("GET")

	// System data generation (all terminals)
	api.HandleFunc("/system/generate", mt.GenerateAll).Methods("POST")

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

	if err := http.ListenAndServe(addr, corsMiddleware(router)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
