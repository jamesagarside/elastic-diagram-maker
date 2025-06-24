// OpenTelemetry configuration
const opentelemetry = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");

// Initialize OpenTelemetry only in production environment
const initializeOpenTelemetry = () => {
  // Return early if not in production
  if (process.env.NODE_ENV !== "production") {
    console.log("OpenTelemetry initialized in development mode (no-op)");
    return { isEnabled: false, sdk: null };
  }

  // Check if OpenTelemetry endpoint is configured
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!otlpEndpoint) {
    console.log("OpenTelemetry disabled: Missing OTEL_EXPORTER_OTLP_ENDPOINT");
    return { isEnabled: false, sdk: null };
  }

  try {
    console.log(`Initializing OpenTelemetry with endpoint: ${otlpEndpoint}`);

    // Parse custom headers if provided
    const customHeaders = {};
    if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
      try {
        const headerPairs = process.env.OTEL_EXPORTER_OTLP_HEADERS.split(",");
        headerPairs.forEach((pair) => {
          const [key, value] = pair.split("=");
          if (key && value) {
            customHeaders[key.trim()] = value.trim();
          }
        });
      } catch (e) {
        console.error("Error parsing OTEL_EXPORTER_OTLP_HEADERS:", e);
      }
    }

    // Parse custom attributes if provided
    const customAttributes = {};
    if (process.env.OTEL_RESOURCE_ATTRIBUTES) {
      try {
        const attributePairs = process.env.OTEL_RESOURCE_ATTRIBUTES.split(",");
        attributePairs.forEach((pair) => {
          const [key, value] = pair.split("=");
          if (key && value) {
            customAttributes[key.trim()] = value.trim();
          }
        });
      } catch (e) {
        console.error("Error parsing OTEL_RESOURCE_ATTRIBUTES:", e);
      }
    }

    // Configure the OTLP exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: customHeaders,
    });

    // Create a custom resource with service information and custom attributes
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "elastic-diagram-maker",
        [SemanticResourceAttributes.SERVICE_VERSION]:
          process.env.npm_package_version || "1.0.0",
        ...customAttributes,
      })
    );

    // Create and register an SDK for Node.js with auto-instrumentations
    const sdk = new opentelemetry.NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-http": {
            enabled: true,
            ignoreIncomingPaths: ["/health", "/metrics", "/favicon.ico"],
          },
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    // Start the OpenTelemetry SDK
    sdk.start();
    console.log("OpenTelemetry initialized successfully in production mode");

    // Handle process shutdown
    process.on("SIGTERM", () => {
      sdk
        .shutdown()
        .then(() => console.log("OpenTelemetry SDK shut down successfully"))
        .catch((error) =>
          console.error("Error shutting down OpenTelemetry SDK", error)
        )
        .finally(() => process.exit(0));
    });

    return { isEnabled: true, sdk };
  } catch (e) {
    console.error("Failed to initialize OpenTelemetry:", e);
    return { isEnabled: false, sdk: null };
  }
};

module.exports = { initializeOpenTelemetry };
