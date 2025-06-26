import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  Fragment,
} from "react";
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiHorizontalRule,
  EuiAccordion,
  EuiBadge,
  EuiLoadingSpinner,
  EuiButtonIcon,
  EuiToolTip,
  EuiPopover,
  EuiIcon,
} from "@elastic/eui";
import "./ArchitectureDiagram.css";

// Import calculation helpers for disk size and CPU
import {
  calculateCPUCount,
  calculateStorageSizeGB,
  formatRatio,
} from "../assets/instance-configurations";

// Import the SVG logos (we'll keep these as fallbacks)
import {
  elasticsearchLogo,
  kibanaLogo,
  logstashLogo,
  beatsLogo,
  mlLogo,
  enterpriseSearchLogo,
  elasticAgentLogo,
} from "../assets/elastic-icons";

// Import the new image icons
import elasticsearchIcon from "../img/icons/elasticsaerch-icon.png";
import kibanaIcon from "../img/icons/kibana-icon.png";
import logstashIcon from "../img/icons/logstash-icon.png";
import agentIcon from "../img/icons/agent-icon.png";
import enterpriseSearchIcon from "../img/icons/enterprise-search-icon.png";
import integrationsServerIcon from "../img/icons/integrations-server-icon.png";

import { useIntegrations } from "../assets/data-integrations.js";
import { DEFAULT_ICON_URL } from "../assets/integration-icon-urls.js";
import { useEtlTools } from "../assets/etl-tools.js";

// Custom hook to calculate optimal number of columns
const useDynamicColumnCount = (containerRef, itemMinWidth = 150) => {
  const [columnCount, setColumnCount] = useState(3); // Default to 3 columns

  const updateColumnCount = useCallback(() => {
    if (!containerRef?.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    // Calculate how many columns we can fit (minimum 1)
    const optimalColumnCount = Math.max(
      1,
      Math.floor(containerWidth / itemMinWidth)
    );
    setColumnCount(optimalColumnCount);

    // Update CSS variable
    const percentage = 100 / optimalColumnCount;
    containerRef.current.style.setProperty(
      "--integration-column-width",
      `${percentage}%`
    );

    console.log(
      `Container width: ${containerWidth}px → ${optimalColumnCount} columns (${percentage.toFixed(
        2
      )}% per column)`
    );
  }, [containerRef, itemMinWidth]);

  // Run once on mount and whenever window resizes
  useEffect(() => {
    // Small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      updateColumnCount();
    }, 100);

    const handleResize = () => {
      updateColumnCount();
    };

    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateColumnCount]);

  return columnCount;
};

const ComponentNode = ({
  icon,
  label,
  size,
  tier,
  imageIcon,
  storageMultiplier,
  cpuMultiplier,
  showResourceInfo,
  instanceConfigId,
}) => {
  // Calculate storage size and CPU count if needed
  const storageSize = showResourceInfo
    ? calculateStorageSizeGB(size * 1024, storageMultiplier)
    : null;
  const cpuCount = showResourceInfo
    ? calculateCPUCount(size * 1024, cpuMultiplier)
    : null;
  const storageRatio = showResourceInfo ? formatRatio(storageMultiplier) : null;
  const cpuRatio = showResourceInfo ? formatRatio(cpuMultiplier) : null;

  return (
    <div className="component-node">
      <div className="component-icon">
        {imageIcon ? (
          // Use the new PNG icons when available
          <img src={imageIcon} alt={label} className="component-image-icon" />
        ) : (
          // Fall back to SVG icons if imageIcon is not provided
          <div dangerouslySetInnerHTML={{ __html: icon }} />
        )}
      </div>
      <div className="node-label">{label}</div>
      {tier && <div className="tier-label">{tier} Tier</div>}

      <div className="node-resources">
        <span className="resource-item resource-ram">{size}GB RAM</span>

        {/* Show storage and CPU info for Elasticsearch nodes */}
        {showResourceInfo && (
          <>
            <span
              className="resource-item resource-disk"
              title={`Memory to Storage ratio ${storageRatio}`}
            >
              {storageSize}GB Disk ({storageRatio})
            </span>
            <span
              className="resource-item resource-cpu"
              title="Virtual CPU count"
            >
              {cpuCount} vCPU
            </span>
          </>
        )}
      </div>

      {/* Instance configuration ID container - always outside the resources container */}
      {instanceConfigId && (
        <div className="resource-instance-id-container">
          <span
            className="resource-instance-id"
            title="Instance Configuration ID"
          >
            {instanceConfigId}
          </span>
        </div>
      )}
    </div>
  );
};

const AvailabilityZone = ({ children, label }) => {
  return (
    <div className="availability-zone">
      <div className="az-label">{label}</div>
      {children}
    </div>
  );
};

const ArchitectureDiagram = ({
  architecture,
  exportToJson,
  handleImportClick,
  isExportPopoverOpen,
  setIsExportPopoverOpen,
}) => {
  // Fetch integrations dynamically using our custom hook
  const { integrations, loading: isLoadingIntegrations } = useIntegrations();

  // Reference to the integrations list container
  const integrationsListRef = useRef(null);

  // Use our dynamic column count hook
  const columnCount = useDynamicColumnCount(integrationsListRef, 150);

  // Adjust how many integrations to show based on column count
  // Show more integrations when more columns are available
  // We show 3 rows of integrations, plus an additional row for wider screens
  const integrationsToShow = Math.min(
    columnCount * (columnCount > 2 ? 4 : 3),
    20
  );

  // Helper function to download the diagram as PNG
  const downloadAsPNG = () => {
    const element = document.querySelector(".architecture-diagram");
    if (!element) return;

    import("html-to-image").then((htmlToImage) => {
      htmlToImage
        .toPng(element)
        .then((dataUrl) => {
          const link = document.createElement("a");
          link.download = "elastic-architecture.png";
          link.href = dataUrl;
          link.click();
        })
        .catch((error) => {
          console.error("Error generating image:", error);
        });
    });
  };

  // Calculate how many nodes are needed based on 64GB max size
  const calculateNodeCount = (nodeSize) => {
    if (!nodeSize) return 1;
    // Always use 64GB as maximum size per node
    const maxSizePerNode = 64;
    return Math.ceil(nodeSize / maxSizePerNode);
  };

  // Generate an array of node sizes to represent splitting large nodes
  const getSplitNodeSizes = (totalSize) => {
    const maxSizePerNode = 64;
    const nodeCount = calculateNodeCount(totalSize);
    const sizes = [];

    let remainingSize = totalSize;

    for (let i = 0; i < nodeCount; i++) {
      const nodeSize = Math.min(remainingSize, maxSizePerNode);
      sizes.push(nodeSize);
      remainingSize -= nodeSize;
    }

    return sizes;
  };

  // Render component nodes in specific AZ
  const renderComponentInAZ = (
    componentName,
    displayName,
    icon,
    azIndex,
    tier = null,
    imageIcon = null
  ) => {
    const component = tier
      ? architecture.components.elasticsearch.tiers[componentName]
      : architecture.components[componentName];

    if (!component || !component.enabled) return null;

    // Skip rendering if this AZ index is beyond the component's azCount
    if (azIndex > component.azCount) return null;

    // If node size exceeds 64GB, split into multiple nodes
    const nodeSizes = getSplitNodeSizes(component.nodeSize);

    // Check if we need to show resource information (storage and CPU)
    // Only for Elasticsearch nodes and ml nodes
    const isElasticsearchNode =
      displayName === "Elasticsearch" || componentName === "mlNodes";
    const showResourceInfo =
      isElasticsearchNode &&
      component.storageMultiplier !== undefined &&
      component.cpuMultiplier !== undefined;

    // Determine instance configuration ID based on node type, cloud provider, and region
    let instanceConfigId = null;

    // Get cloud provider and region from architecture state
    const provider = architecture.environment.cloudProvider || "aws";
    const region = architecture.environment.region || "us-east-1";

    // Format instance configuration ID based on Elasticsearch's naming convention
    if (isElasticsearchNode) {
      if (tier) {
        // For hot, warm, cold, frozen tiers
        const tierKey = componentName.toLowerCase();
        instanceConfigId = `${provider}.${region}.elasticsearch.${tierKey}`;
      } else if (componentName === "mlNodes") {
        // For ML nodes
        instanceConfigId = `${provider}.${region}.elasticsearch.ml`;
      }
    } else if (componentName === "kibana") {
      instanceConfigId = `${provider}.${region}.kibana`;
    } else if (componentName === "enterpriseSearch") {
      instanceConfigId = `${provider}.${region}.enterprise_search`;
    } else if (componentName === "integrationsServer") {
      instanceConfigId = `${provider}.${region}.integrations_server`;
    }

    return nodeSizes.map((nodeSize, index) => (
      <EuiFlexItem key={`${componentName}-${index}-az${azIndex}`}>
        <ComponentNode
          icon={icon}
          label={displayName}
          tier={tier}
          size={nodeSize}
          imageIcon={imageIcon}
          storageMultiplier={component.storageMultiplier}
          cpuMultiplier={component.cpuMultiplier}
          showResourceInfo={showResourceInfo}
          instanceConfigId={instanceConfigId}
        />
        {nodeSizes.length > 1 && (
          <div className="node-index">
            Node {index + 1} of {nodeSizes.length}
          </div>
        )}
      </EuiFlexItem>
    ));
  };

  // Find the maximum azCount across all enabled components
  const getMaxAZCount = () => {
    let maxCount = 0;

    // Check all regular components
    Object.keys(architecture.components).forEach((componentName) => {
      const component = architecture.components[componentName];
      if (
        component.enabled &&
        component.azCount &&
        componentName !== "elasticAgent" &&
        componentName !== "elasticsearch"
      ) {
        maxCount = Math.max(maxCount, component.azCount);
      }
    });

    // Check elasticsearch tiers
    if (architecture.components.elasticsearch.enabled) {
      Object.keys(architecture.components.elasticsearch.tiers).forEach(
        (tierName) => {
          const tier = architecture.components.elasticsearch.tiers[tierName];
          if (tier.enabled && tier.azCount) {
            maxCount = Math.max(maxCount, tier.azCount);
          }
        }
      );
    }

    return maxCount || 1; // Default to 1 if no components are enabled
  };

  // Helper to render multiple availability zones
  const renderAvailabilityZones = () => {
    const maxAZCount = getMaxAZCount();
    const zones = [];

    for (let i = 1; i <= maxAZCount; i++) {
      zones.push(
        <EuiFlexItem key={`az-${i}`}>
          <AvailabilityZone label={`Availability Zone ${i}`}>
            <EuiFlexGroup direction="column" gutterSize="s">
              {/* Elasticsearch Tiers */}
              {architecture.components.elasticsearch.enabled && (
                <>
                  {renderComponentInAZ(
                    "hot",
                    "Elasticsearch",
                    elasticsearchLogo,
                    i,
                    "Hot",
                    elasticsearchIcon
                  )}
                  {renderComponentInAZ(
                    "warm",
                    "Elasticsearch",
                    elasticsearchLogo,
                    i,
                    "Warm",
                    elasticsearchIcon
                  )}
                  {renderComponentInAZ(
                    "cold",
                    "Elasticsearch",
                    elasticsearchLogo,
                    i,
                    "Cold",
                    elasticsearchIcon
                  )}
                  {renderComponentInAZ(
                    "frozen",
                    "Elasticsearch",
                    elasticsearchLogo,
                    i,
                    "Frozen",
                    elasticsearchIcon
                  )}
                </>
              )}

              {/* ML Nodes - using same icon as Elasticsearch */}
              {renderComponentInAZ(
                "mlNodes",
                "Machine Learning",
                mlLogo,
                i,
                null,
                elasticsearchIcon
              )}

              {/* Kibana */}
              {renderComponentInAZ(
                "kibana",
                "Kibana",
                kibanaLogo,
                i,
                null,
                kibanaIcon
              )}

              {/* Enterprise Search */}
              {renderComponentInAZ(
                "enterpriseSearch",
                "Enterprise Search",
                enterpriseSearchLogo,
                i,
                null,
                enterpriseSearchIcon
              )}

              {/* Integrations Server */}
              {renderComponentInAZ(
                "integrationsServer",
                "Integrations Server",
                beatsLogo,
                i,
                null,
                integrationsServerIcon
              )}

              {/* Logstash moved to Data Collection tier */}
            </EuiFlexGroup>
          </AvailabilityZone>
        </EuiFlexItem>
      );
    }

    return zones;
  };

  // Get ETL tools data
  const { tools: etlTools } = useEtlTools();

  const renderAgents = () => {
    const hasEnabledAgents = architecture.components.elasticAgents?.some(
      (agent) => agent.enabled
    );
    const hasEnabledEtlTools = architecture.components.etlQueueTools?.some(
      (tool) => tool.enabled && tool.toolType
    );
    const hasEnabledLogstash = architecture.components.logstashInstances?.some(
      (instance) => instance.enabled
    );
    const showDataCollection =
      hasEnabledAgents || hasEnabledLogstash || hasEnabledEtlTools;

    if (!showDataCollection) return null;

    // Get enabled agents
    const enabledAgents =
      architecture.components.elasticAgents?.filter((agent) => agent.enabled) ||
      [];

    // Group agents by routing
    const directAgents = enabledAgents.filter(
      (agent) => agent.dataRouting === "direct"
    );

    // Group agents by Logstash instance
    const logstashInstancesWithAgents =
      architecture.components.logstashInstances
        .filter((instance) => instance.enabled)
        .map((instance) => ({
          instance,
          agents: enabledAgents.filter(
            (agent) => agent.dataRouting === `logstash:${instance.id}`
          ),
        }));

    // Group ETL tools and their connected agents
    const etlToolsWithAgents = architecture.components.etlQueueTools
      .filter((tool) => tool.enabled && tool.toolType)
      .map((tool) => ({
        tool,
        agents: enabledAgents.filter(
          (agent) => agent.dataRouting === `etl:${tool.id}`
        ),
      }));

    // Count the number of columns to adjust spacing
    const totalColumns =
      etlToolsWithAgents.length +
      logstashInstancesWithAgents.length +
      (directAgents.length > 0 ? 1 : 0);

    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiTitle size="xs">
          <h3>Data Collection</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <div
          className="data-collection-container"
          style={{
            "--total-columns": totalColumns,
          }}
        >
          <EuiText size="xs" color="subdued">
            <p>
              Each column below represents a data routing path with its agents
            </p>
          </EuiText>
          <EuiSpacer size="s" />

          {/* ETL tools and Logstash columns */}
          <div className="routing-columns">
            {/* Render ETL tool columns with their connected agents */}
            {etlToolsWithAgents.map(({ tool, agents }) => {
              const etlTool = etlTools.find((t) => t.id === tool.toolType);
              if (!etlTool) return null;

              return (
                <div key={`etl-column-${tool.id}`} className="routing-column">
                  {/* ETL Tool Header */}
                  <div className="router-header">
                    <div className="component-node etl-tool-node">
                      <div className="component-icon">
                        <img
                          src={etlTool.icon || DEFAULT_ICON_URL}
                          alt={etlTool.name}
                          className="component-image-icon"
                          onError={(e) => {
                            e.target.src = DEFAULT_ICON_URL;
                          }}
                        />
                      </div>
                      <div className="node-label">{tool.name}</div>
                      <div className="node-type">
                        <EuiBadge color="hollow">{etlTool.name}</EuiBadge>
                      </div>
                      {agents.length > 0 && (
                        <div className="data-flow-indicator">
                          <EuiIcon type="arrowDown" color="primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agents stacked vertically below the ETL Tool */}
                  {agents.length > 0 && (
                    <div className="agent-column">
                      {agents.map((agent) => renderAgentNode(agent, true))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Logstash instances columns with their connected agents */}
            {logstashInstancesWithAgents.map(({ instance, agents }) => (
              <div
                key={`logstash-column-${instance.id}`}
                className="routing-column"
              >
                {/* Logstash Instance Header */}
                <div className="router-header">
                  <div className="component-node logstash-node">
                    <div className="component-icon">
                      <img
                        src={logstashIcon}
                        alt={instance.name}
                        className="component-image-icon"
                      />
                    </div>
                    <div className="node-label">{instance.name}</div>
                    {agents.length > 0 && (
                      <div className="data-flow-indicator">
                        <EuiIcon type="arrowDown" color="primary" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Agents stacked vertically below Logstash instance */}
                {agents.length > 0 && (
                  <div className="agent-column">
                    {agents.map((agent) => renderAgentNode(agent, true))}
                  </div>
                )}
              </div>
            ))}

            {/* Direct agents column */}
            {directAgents.length > 0 && (
              <div className="routing-column direct-agent-column">
                {/* Direct to Elasticsearch Header */}
                <div className="router-header">
                  <div className="component-node elasticsearch-node">
                    <div className="component-icon">
                      <img
                        src={elasticsearchIcon}
                        alt="Elasticsearch"
                        className="component-image-icon"
                      />
                    </div>
                    <div className="node-label">Direct to Elasticsearch</div>
                    <div className="data-flow-indicator">
                      <EuiIcon type="arrowDown" color="primary" />
                    </div>
                  </div>
                </div>

                {/* Direct agents stacked vertically */}
                <div className="agent-column">
                  {directAgents.map((agent) => renderAgentNode(agent, false))}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Helper function to render an agent node
  const renderAgentNode = (agent, isUnderRouter) => {
    const selectedIntegrations = agent.selectedIntegrations || [];
    const dataRouting = agent.dataRouting || "direct"; // Determine the routing type and class for styling
    let routingType;
    let routingClass;

    if (dataRouting.startsWith("logstash:")) {
      const logstashId = dataRouting.split(":")[1];
      const logstashInstance = architecture.components.logstashInstances.find(
        (instance) => instance.id === logstashId
      );
      routingType = `Via ${logstashInstance?.name || "Logstash"}`;
      routingClass = "logstash-routed";
    } else if (dataRouting.startsWith("etl:")) {
      const etlTool = architecture.components.etlQueueTools.find(
        (tool) => `etl:${tool.id}` === dataRouting
      );
      routingType = `Via ${etlTool?.name || "ETL Tool"}`;
      routingClass = "etl-routed";
    } else {
      routingType = "Direct to Elasticsearch";
      routingClass = "elasticsearch-routed";
    }

    return (
      <div
        key={agent.id}
        className={`component-node agent-node ${routingClass} ${
          isUnderRouter ? "agent-below-router" : ""
        }`}
      >
        <div className="component-icon">
          <img
            src={agentIcon}
            alt={agent.name}
            className="component-image-icon"
          />
        </div>
        <div className="node-label">{agent.name}</div>
        <div className="routing-info">
          <EuiBadge color={isUnderRouter ? "primary" : "default"}>
            {routingType}
          </EuiBadge>
        </div>
        {selectedIntegrations.length > 0 && (
          <div className="integrations-list">
            <EuiText size="xs" color="subdued">
              <p>
                <strong>
                  Enabled Integrations ({selectedIntegrations.length}):
                </strong>
              </p>
            </EuiText>
            <div className="integration-items">
              {selectedIntegrations.slice(0, 10).map((integrationId) => {
                // Find the integration in the list to get its label and icon
                const integrationObj = integrations.find(
                  (i) => i.value === integrationId
                );
                const integrationLabel = integrationObj?.label || integrationId;
                const iconUrl = integrationObj?.icon || DEFAULT_ICON_URL;

                return (
                  <div key={integrationId} className="integration-item">
                    <span className="integration-icon">
                      <img
                        src={iconUrl}
                        alt={integrationLabel}
                        width="20"
                        height="20"
                        onError={(e) => {
                          e.target.src = DEFAULT_ICON_URL;
                        }}
                      />
                    </span>
                    <span className="integration-name">{integrationLabel}</span>
                  </div>
                );
              })}
              {selectedIntegrations.length > 10 && (
                <div className="integration-more">
                  +{selectedIntegrations.length - 10} more integrations
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>Architecture Diagram</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div
            className="button-container"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Import button using EuiButton */}
            <EuiButton
              size="s"
              iconType="importAction"
              onClick={handleImportClick}
            >
              Import as JSON
            </EuiButton>

            {/* Export button and popover */}
            <EuiPopover
              button={
                <EuiButton
                  size="s"
                  iconType="exportAction"
                  onClick={() => setIsExportPopoverOpen(!isExportPopoverOpen)}
                >
                  Export as JSON
                </EuiButton>
              }
              isOpen={isExportPopoverOpen}
              closePopover={() => setIsExportPopoverOpen(false)}
            >
              <div style={{ padding: "12px" }}>
                <EuiText size="s">
                  <p>Export your current architecture configuration as JSON.</p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiButton size="s" fill onClick={exportToJson}>
                  Export as JSON
                </EuiButton>
              </div>
            </EuiPopover>

            {/* Download as PNG button */}
            <EuiButton size="s" iconType="download" onClick={downloadAsPNG}>
              Download as PNG
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <div className="architecture-diagram">
        <EuiAccordion
          id="elastic-stack-components"
          buttonContent="Elastic Stack Components"
          initialIsOpen={true}
          paddingSize="m"
        >
          <EuiFlexGroup>{renderAvailabilityZones()}</EuiFlexGroup>
        </EuiAccordion>

        {renderAgents()}
      </div>

      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <p>
          This diagram represents a logical architecture. The actual deployment
          might differ based on specific requirements and optimizations.
        </p>
      </EuiText>
    </EuiPanel>
  );
};

export default ArchitectureDiagram;
