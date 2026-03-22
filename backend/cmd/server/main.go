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
	// Parse command line flags
	configPath := flag.String("config", "config.json", "Path to config file")
	dbPath := flag.String("db", "", "Path to SQLite database file (overrides config)")
	port := flag.String("port", "", "Server port (overrides config)")
	flag.Parse()

	// Load configuration
	cfg, err := config.LoadConfigWithDefaults(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Override with command line flags if provided
	if *dbPath != "" {
		cfg.Database.Path = *dbPath
	}
	if *port != "" {
		cfg.Server.Port = *port
	}

	// Initialize database
	db, err := database.NewDB(cfg.Database.Path)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	log.Printf("Database initialized at: %s", cfg.Database.Path)

	// Initialize services
	loader := services.NewLoader(db)
	queryService := services.NewQueryService(db)
	generator := services.NewGenerator(db)
	uploadService := services.NewUploadService(db)
	tagsService := services.NewTagsService(db)
	railcarService := services.NewRailcarService(db)
	electricitySvc := services.NewElectricityService(db)
	steamSvc := services.NewSteamService(db)
	boilerSvc := services.NewBoilerService(db)
	tankSvc := services.NewTankService(db)
	subStationSvc := services.NewSubStationService(db)
	systemGenSvc := services.NewSystemGeneratorService(db)

	minValue, maxValue, useSequential, startTime, endTime := cfg.GenerationDefaults()

	// Initialize handlers
	loadHandler := handlers.NewLoadHandler(loader, cfg.Data.RawDataFolder)
	queryHandler := handlers.NewQueryHandler(queryService)
	generatorHandler := handlers.NewGeneratorHandler(generator, minValue, maxValue, useSequential, startTime, endTime)
	configHandler := handlers.NewConfigHandler(minValue, maxValue, cfg.Server.Port, cfg.Frontend.ApiBaseURL)
	uploadHandler := handlers.NewUploadHandler(uploadService)
	tagsHandler := handlers.NewTagsHandler(tagsService)
	railcarHandler := handlers.NewRailcarHandler(railcarService)
	electricityHandler := handlers.NewElectricityHandler(electricitySvc)
	steamHandler := handlers.NewSteamHandler(steamSvc)
	boilerHandler := handlers.NewBoilerHandler(boilerSvc)
	tankHandler := handlers.NewTankHandler(tankSvc)
	subStationHandler := handlers.NewSubStationHandler(subStationSvc)
	systemHandler := handlers.NewSystemHandler(systemGenSvc)

	// Setup router
	router := mux.NewRouter()

	// DELETE /api/railcars/all must be on main router so it matches before /api/railcars/{id} (else "all" is captured as id and returns 404)
	router.HandleFunc("/api/railcars/all", railcarHandler.HandleDeleteAll).Methods("DELETE")

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/config", configHandler.Handle).Methods("GET")
	api.HandleFunc("/load", loadHandler.Handle).Methods("POST")
	api.HandleFunc("/generate-dummy", generatorHandler.Handle).Methods("POST")
	api.HandleFunc("/upload-csv", uploadHandler.Handle).Methods("POST")
	api.HandleFunc("/tags/names", tagsHandler.HandleListNames).Methods("GET")
	api.HandleFunc("/tags", tagsHandler.HandleGet).Methods("GET")
	api.HandleFunc("/tags", tagsHandler.HandleDelete).Methods("DELETE")
	api.HandleFunc("/tags", tagsHandler.HandlePost).Methods("POST")
	// Railcar CRUD and import (PRD + Savana)
	api.HandleFunc("/railcars/import/savana", railcarHandler.HandleImportSavana).Methods("POST")
	api.HandleFunc("/railcars/import", railcarHandler.HandleImport).Methods("POST")
	api.HandleFunc("/railcars/{id}", railcarHandler.HandleGet).Methods("GET")
	api.HandleFunc("/railcars/{id}", railcarHandler.HandleUpdate).Methods("PUT")
	api.HandleFunc("/railcars/{id}", railcarHandler.HandleDelete).Methods("DELETE")
	api.HandleFunc("/railcars", railcarHandler.HandleList).Methods("GET")
	api.HandleFunc("/railcars", railcarHandler.HandleCreate).Methods("POST")
	// Electricity API
	api.HandleFunc("/electricity/kpis", electricityHandler.HandleGetKPIs).Methods("GET")
	api.HandleFunc("/electricity/load-profiles", electricityHandler.HandleGetLoadProfiles).Methods("GET")
	api.HandleFunc("/electricity/weekly-consumption", electricityHandler.HandleGetWeeklyConsumption).Methods("GET")
	api.HandleFunc("/electricity/power-factor", electricityHandler.HandleGetPowerFactor).Methods("GET")
	api.HandleFunc("/electricity/cost-breakdown", electricityHandler.HandleGetCostBreakdown).Methods("GET")
	api.HandleFunc("/electricity/peak-demand", electricityHandler.HandleGetPeakDemand).Methods("GET")
	api.HandleFunc("/electricity/phase-balance", electricityHandler.HandleGetPhaseBalance).Methods("GET")
	api.HandleFunc("/electricity/ingest", electricityHandler.HandleIngest).Methods("POST")
	// Steam API
	api.HandleFunc("/steam/kpis", steamHandler.HandleGetKPIs).Methods("GET")
	api.HandleFunc("/steam/balance", steamHandler.HandleGetBalance).Methods("GET")
	api.HandleFunc("/steam/header-pressure", steamHandler.HandleGetHeaderPressure).Methods("GET")
	api.HandleFunc("/steam/distribution", steamHandler.HandleGetDistribution).Methods("GET")
	api.HandleFunc("/steam/condensate", steamHandler.HandleGetCondensate).Methods("GET")
	api.HandleFunc("/steam/fuel-ratio", steamHandler.HandleGetFuelRatio).Methods("GET")
	api.HandleFunc("/steam/loss", steamHandler.HandleGetLoss).Methods("GET")
	api.HandleFunc("/steam/ingest", steamHandler.HandleIngest).Methods("POST")
	// Boiler API
	api.HandleFunc("/boiler/kpis", boilerHandler.HandleGetKPIs).Methods("GET")
	api.HandleFunc("/boiler/readings", boilerHandler.HandleGetReadings).Methods("GET")
	api.HandleFunc("/boiler/efficiency-trend", boilerHandler.HandleGetEfficiencyTrend).Methods("GET")
	api.HandleFunc("/boiler/combustion", boilerHandler.HandleGetCombustion).Methods("GET")
	api.HandleFunc("/boiler/steam-fuel", boilerHandler.HandleGetSteamFuel).Methods("GET")
	api.HandleFunc("/boiler/emissions", boilerHandler.HandleGetEmissions).Methods("GET")
	api.HandleFunc("/boiler/stack-temp", boilerHandler.HandleGetStackTemp).Methods("GET")
	api.HandleFunc("/boiler/ingest", boilerHandler.HandleIngest).Methods("POST")
	// Tank API
	api.HandleFunc("/tank/kpis", tankHandler.HandleGetKPIs).Methods("GET")
	api.HandleFunc("/tank/levels", tankHandler.HandleGetLevels).Methods("GET")
	api.HandleFunc("/tank/inventory-trend", tankHandler.HandleGetInventoryTrend).Methods("GET")
	api.HandleFunc("/tank/throughput", tankHandler.HandleGetThroughput).Methods("GET")
	api.HandleFunc("/tank/product-distribution", tankHandler.HandleGetProductDistribution).Methods("GET")
	api.HandleFunc("/tank/level-changes", tankHandler.HandleGetLevelChanges).Methods("GET")
	api.HandleFunc("/tank/temperatures", tankHandler.HandleGetTemperatures).Methods("GET")
	api.HandleFunc("/tank/ingest", tankHandler.HandleIngest).Methods("POST")
	// SubStation API
	api.HandleFunc("/substation/kpis", subStationHandler.HandleGetKPIs).Methods("GET")
	api.HandleFunc("/substation/voltage-profile", subStationHandler.HandleGetVoltageProfile).Methods("GET")
	api.HandleFunc("/substation/transformers", subStationHandler.HandleGetTransformers).Methods("GET")
	api.HandleFunc("/substation/harmonics", subStationHandler.HandleGetHarmonics).Methods("GET")
	api.HandleFunc("/substation/transformer-temp", subStationHandler.HandleGetTransformerTemp).Methods("GET")
	api.HandleFunc("/substation/feeder-distribution", subStationHandler.HandleGetFeederDistribution).Methods("GET")
	api.HandleFunc("/substation/fault-events", subStationHandler.HandleGetFaultEvents).Methods("GET")
	api.HandleFunc("/substation/ingest", subStationHandler.HandleIngest).Methods("POST")
	// System data generation
	api.HandleFunc("/system/generate", systemHandler.HandleGenerate).Methods("POST")
	// Handle timeseriesdata with flexible path matching
	api.PathPrefix("/timeseriesdata/").HandlerFunc(queryHandler.Handle).Methods("GET")

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	}).Methods("GET")

	// CORS middleware: allow all origins in dev
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// Start server with CORS wrapper
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	log.Printf("API endpoints:")
	log.Printf("  GET  /api/config")
	log.Printf("  POST /api/load")
	log.Printf("  POST /api/generate-dummy")
	log.Printf("  POST /api/upload-csv")
	log.Printf("  GET  /api/timeseriesdata/{start}/{end}?tags=<tag1,tag2>")
	log.Printf("  GET  /api/tags")
	log.Printf("  DELETE /api/tags?tag=<name>")
	log.Printf("  GET  /api/tags/names")
	log.Printf("  POST /api/tags")
	log.Printf("  GET  /api/railcars")
	log.Printf("  GET  /api/railcars/{id}")
	log.Printf("  POST /api/railcars")
	log.Printf("  PUT  /api/railcars/{id}")
	log.Printf("  DELETE /api/railcars/{id}")
	log.Printf("  DELETE /api/railcars/all")
	log.Printf("  POST /api/railcars/import")
	log.Printf("  POST /api/railcars/import/savana")
	log.Printf("  GET  /api/electricity/kpis")
	log.Printf("  GET  /api/electricity/load-profiles")
	log.Printf("  GET  /api/electricity/weekly-consumption")
	log.Printf("  GET  /api/electricity/power-factor")
	log.Printf("  GET  /api/electricity/cost-breakdown")
	log.Printf("  GET  /api/electricity/peak-demand")
	log.Printf("  GET  /api/electricity/phase-balance")
	log.Printf("  POST /api/electricity/ingest")
	log.Printf("  GET  /api/steam/kpis")
	log.Printf("  GET  /api/steam/balance")
	log.Printf("  GET  /api/steam/header-pressure")
	log.Printf("  GET  /api/steam/distribution")
	log.Printf("  GET  /api/steam/condensate")
	log.Printf("  GET  /api/steam/fuel-ratio")
	log.Printf("  GET  /api/steam/loss")
	log.Printf("  POST /api/steam/ingest")
	log.Printf("  GET  /api/boiler/kpis")
	log.Printf("  GET  /api/boiler/readings")
	log.Printf("  GET  /api/boiler/efficiency-trend")
	log.Printf("  GET  /api/boiler/combustion")
	log.Printf("  GET  /api/boiler/steam-fuel")
	log.Printf("  GET  /api/boiler/emissions")
	log.Printf("  GET  /api/boiler/stack-temp")
	log.Printf("  POST /api/boiler/ingest")
	log.Printf("  GET  /api/tank/kpis")
	log.Printf("  GET  /api/tank/levels")
	log.Printf("  GET  /api/tank/inventory-trend")
	log.Printf("  GET  /api/tank/throughput")
	log.Printf("  GET  /api/tank/product-distribution")
	log.Printf("  GET  /api/tank/level-changes")
	log.Printf("  GET  /api/tank/temperatures")
	log.Printf("  POST /api/tank/ingest")
	log.Printf("  GET  /api/substation/kpis")
	log.Printf("  GET  /api/substation/voltage-profile")
	log.Printf("  GET  /api/substation/transformers")
	log.Printf("  GET  /api/substation/harmonics")
	log.Printf("  GET  /api/substation/transformer-temp")
	log.Printf("  GET  /api/substation/feeder-distribution")
	log.Printf("  GET  /api/substation/fault-events")
	log.Printf("  POST /api/substation/ingest")
	log.Printf("  POST /api/system/generate")
	log.Printf("  GET  /health")

	if err := http.ListenAndServe(addr, corsMiddleware(router)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
