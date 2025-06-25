# Telemetry Configuration

This document describes how to configure OpenTelemetry for the Elastic Diagram Maker application when running in production.

## Overview

The application uses OpenTelemetry to collect and export telemetry data (traces, metrics, and logs) to an OpenTelemetry collector or compatible backend. This functionality is:

- Only enabled in production environment (`NODE_ENV=production`)
- Requires explicit configuration via environment variables
- Does not collect any user data or personal information
- Focuses on application health, performance, and error tracking

## Configuration

### Environment Variables

Configure OpenTelemetry by setting the following environment variables:

| Environment Variable          | Description                                                           | Example                                                      |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | **Required**. The URL of the OpenTelemetry collector endpoint         | `https://otel-collector.example.com:4318`                    |
| `OTEL_EXPORTER_OTLP_HEADERS`  | Optional. HTTP headers to include with every request to the collector | `api-key=your-api-key,authorization=Bearer xyz`              |
| `OTEL_RESOURCE_ATTRIBUTES`    | Optional. Additional attributes to include with the telemetry data    | `deployment.environment=prod,service.instance.id=instance-1` |

### Docker Configuration

When running the application with Docker, you can provide these environment variables like this:

```bash
docker run -p 3001:3001 \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4318 \
  -e OTEL_EXPORTER_OTLP_HEADERS="api-key=your-api-key" \
  -e OTEL_RESOURCE_ATTRIBUTES="deployment.environment=prod,service.instance.id=instance-1" \
  elastic-diagram-maker
```

### Kubernetes Configuration

In Kubernetes, you can set these environment variables in your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elastic-diagram-maker
spec:
  template:
    spec:
      containers:
        - name: elastic-diagram-maker
          image: elastic-diagram-maker:latest
          env:
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "https://otel-collector.example.com:4318"
            - name: OTEL_EXPORTER_OTLP_HEADERS
              valueFrom:
                secretKeyRef:
                  name: otel-credentials
                  key: headers
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "deployment.environment=prod,service.instance.id=instance-1"
```

## Verification

You can verify that telemetry is working by:

1. Checking the application logs at startup, which will indicate if OpenTelemetry is enabled
2. Accessing the health endpoint at `/health`, which returns telemetry status
3. Confirming data reception in your OpenTelemetry backend

## Collected Data

The application collects the following telemetry data:

- HTTP request/response information (paths, method, status codes, duration)
- Server errors and warnings
- Resource utilization metrics (CPU, memory)
- Custom application events (startup, shutdown, etc.)

No user data, content, or personally identifiable information is collected.

## Disabling Telemetry

To disable telemetry, simply don't set the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable.
