import React, { useEffect, useState, useRef, useCallback } from "react";
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

  const renderAgents = () => {
    const showDataCollection =
      architecture.components.elasticAgent.enabled ||
      architecture.components.logstash.enabled;

    if (!showDataCollection) return null;

    // Get the selected integrations
    const selectedIntegrations =
      architecture.components.elasticAgent.selectedIntegrations || [];

    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiTitle size="xs">
          <h3>Data Collection</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          {architecture.components.elasticAgent.enabled && (
            <EuiFlexItem>
              <div className="component-node">
                <div className="component-icon">
                  {/* Use the new agent icon image */}
                  <img
                    src={agentIcon}
                    alt="Elastic Agent"
                    className="component-image-icon"
                  />
                </div>
                <div className="node-label">Elastic Agent</div>
                {selectedIntegrations.length > 0 && (
                  <div className="integrations-list" ref={integrationsListRef}>
                    <EuiText size="xs" color="subdued">
                      <p>
                        <strong>
                          Enabled Integrations ({selectedIntegrations.length}):
                        </strong>
                      </p>
                      <ul className="integration-items">
                        {isLoadingIntegrations ? (
                          <li className="integration-item">
                            <EuiLoadingSpinner size="m" /> Loading
                            integrations...
                          </li>
                        ) : (
                          <>
                            {selectedIntegrations
                              .slice(0, integrationsToShow)
                              .map((integrationValue, index) => {
                                // Find the integration in the list to get its label and icon
                                const integrationObj = integrations.find(
                                  (i) => i.value === integrationValue
                                );
                                const integrationLabel =
                                  integrationObj?.label || integrationValue;

                                return (
                                  <li key={index} className="integration-item">
                                    <span
                                      className="integration-icon"
                                      dangerouslySetInnerHTML={{
                                        __html: integrationObj?.icon
                                          ? `<img src="${integrationObj.icon}" alt="${integrationLabel}" class="integration-icon" width="16" height="16" onerror="this.src='${DEFAULT_ICON_URL}';" />`
                                          : `<img src="${DEFAULT_ICON_URL}" alt="${integrationLabel}" class="integration-icon" width="16" height="16" />`,
                                      }}
                                    ></span>
                                    <span title={integrationLabel}>
                                      {integrationLabel}
                                    </span>
                                  </li>
                                );
                              })}
                            {selectedIntegrations.length >
                              integrationsToShow && (
                              <li className="integration-more">
                                +
                                {selectedIntegrations.length -
                                  integrationsToShow}{" "}
                                more
                              </li>
                            )}
                          </>
                        )}
                      </ul>
                    </EuiText>
                  </div>
                )}
              </div>
            </EuiFlexItem>
          )}

          {/* Logstash in Data Collection Tier */}
          {architecture.components.logstash.enabled && (
            <EuiFlexItem>
              <div className="component-node">
                <div className="component-icon">
                  {/* Use the new logstash icon image */}
                  <img
                    src={logstashIcon}
                    alt="Logstash"
                    className="component-image-icon"
                  />
                </div>
                <div className="node-label">Logstash</div>
                {/* Display node size if configured */}
                {architecture.components.logstash.nodeSize && (
                  <div className="node-size">
                    {architecture.components.logstash.nodeSize}GB
                  </div>
                )}
              </div>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
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
