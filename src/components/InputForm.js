import React, { useState, useEffect } from "react";
// Import the dynamic integrations fetching hook
import { useIntegrations } from "../assets/data-integrations";
// Import the default icon URL
import { DEFAULT_ICON_URL } from "../assets/integration-icon-urls";
import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiSpacer,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiSelect,
  EuiAccordion,
  EuiHorizontalRule,
  EuiComboBox,
  EuiLoadingSpinner,
  EuiHealth,
} from "@elastic/eui";

// Helper function to get node sizes - powers of 2 up to 64GB, then 64GB increments
const getNodeSizes = () => {
  const sizes = [];

  // Powers of 2 for smaller sizes (1, 2, 4, 8, 16, 32, 64)
  for (let i = 0; i <= 6; i++) {
    const size = Math.pow(2, i);
    sizes.push({ value: size.toString(), text: `${size}GB` });
  }

  // After 64GB, go up in 64GB increments up to 2048GB (2TB)
  for (let size = 128; size <= 2048; size += 64) {
    const displayText = size >= 1024 ? `${size / 1024}TB` : `${size}GB`;
    sizes.push({ value: size.toString(), text: displayText });
  }

  return sizes;
};

// Helper function to get AZ count options (1, 2, or 3)
const getAZCountOptions = () => {
  return [
    { value: "1", text: "1 Availability Zone" },
    { value: "2", text: "2 Availability Zones" },
    { value: "3", text: "3 Availability Zones" },
  ];
};

const InputForm = ({ architecture, updateArchitecture }) => {
  const nodeSizes = getNodeSizes();
  const azCountOptions = getAZCountOptions();

  // Fetch integrations dynamically using our custom hook
  const {
    integrations,
    loading: isLoadingIntegrations,
    error: integrationsError,
  } = useIntegrations();

  const handleComponentToggle = (componentName) => {
    if (componentName === "elasticsearch") {
      updateArchitecture({
        ...architecture,
        components: {
          ...architecture.components,
          elasticsearch: {
            ...architecture.components.elasticsearch,
            enabled: !architecture.components.elasticsearch.enabled,
          },
        },
      });
    } else {
      updateArchitecture({
        ...architecture,
        components: {
          ...architecture.components,
          [componentName]: {
            ...architecture.components[componentName],
            enabled: !architecture.components[componentName].enabled,
          },
        },
      });
    }
  };

  const handleTierToggle = (tier) => {
    updateArchitecture({
      ...architecture,
      components: {
        ...architecture.components,
        elasticsearch: {
          ...architecture.components.elasticsearch,
          tiers: {
            ...architecture.components.elasticsearch.tiers,
            [tier]: {
              ...architecture.components.elasticsearch.tiers[tier],
              enabled:
                !architecture.components.elasticsearch.tiers[tier].enabled,
            },
          },
        },
      },
    });
  };

  const handleComponentAZCountChange = (componentName, value) => {
    const azCount = parseInt(value, 10);
    updateArchitecture({
      ...architecture,
      components: {
        ...architecture.components,
        [componentName]: {
          ...architecture.components[componentName],
          azCount: azCount,
        },
      },
    });
  };

  const handleTierAZCountChange = (tier, value) => {
    const azCount = parseInt(value, 10);
    updateArchitecture({
      ...architecture,
      components: {
        ...architecture.components,
        elasticsearch: {
          ...architecture.components.elasticsearch,
          tiers: {
            ...architecture.components.elasticsearch.tiers,
            [tier]: {
              ...architecture.components.elasticsearch.tiers[tier],
              azCount: azCount,
            },
          },
        },
      },
    });
  };

  const handleComponentNodeSizeChange = (componentName, value) => {
    const sizeValue = parseInt(value, 10);
    updateArchitecture({
      ...architecture,
      components: {
        ...architecture.components,
        [componentName]: {
          ...architecture.components[componentName],
          nodeSize: sizeValue,
        },
      },
    });
  };

  const handleTierNodeSizeChange = (tier, value) => {
    const sizeValue = parseInt(value, 10);
    updateArchitecture({
      ...architecture,
      components: {
        ...architecture.components,
        elasticsearch: {
          ...architecture.components.elasticsearch,
          tiers: {
            ...architecture.components.elasticsearch.tiers,
            [tier]: {
              ...architecture.components.elasticsearch.tiers[tier],
              nodeSize: sizeValue,
            },
          },
        },
      },
    });
  };

  const resetForm = () => {
    updateArchitecture({
      components: {
        kibana: {
          enabled: false,
          azCount: 1,
          nodeSize: 4,
        },
        elasticsearch: {
          enabled: true,
          tiers: {
            hot: {
              enabled: true,
              azCount: 1,
              nodeSize: 8,
            },
            warm: {
              enabled: false,
              azCount: 1,
              nodeSize: 8,
            },
            cold: {
              enabled: false,
              azCount: 1,
              nodeSize: 4,
            },
            frozen: {
              enabled: false,
              azCount: 1,
              nodeSize: 2,
            },
          },
        },
        mlNodes: {
          enabled: false,
          azCount: 1,
          nodeSize: 8,
        },
        enterpriseSearch: {
          enabled: false,
          azCount: 1,
          nodeSize: 4,
        },
        integrationsServer: {
          enabled: false,
          azCount: 1,
          nodeSize: 2,
        },
        logstash: {
          enabled: false,
          azCount: 1,
          nodeSize: 2,
        },
        elasticAgent: {
          enabled: false,
          selectedIntegrations: [],
        },
      },
    });
  };

  // Calculate the estimated memory for the entire cluster
  const estimateClusterSize = () => {
    let totalSize = 0;

    // Iterate through components
    Object.keys(architecture.components).forEach((componentName) => {
      const component = architecture.components[componentName];

      // Skip elastic agent as it doesn't have node sizes
      if (componentName === "elasticAgent") return;

      // Handle Elasticsearch tiers specially
      if (componentName === "elasticsearch" && component.enabled) {
        Object.keys(component.tiers).forEach((tierName) => {
          const tier = component.tiers[tierName];
          if (tier.enabled) {
            totalSize += tier.azCount * tier.nodeSize;
          }
        });
      }
      // Handle other components
      else if (component.enabled) {
        totalSize += component.azCount * component.nodeSize;
      }
    });

    return totalSize;
  };

  // Calculate how many nodes are needed based on 64GB max size
  const calculateNodeCount = (component) => {
    if (!component || !component.nodeSize) return 1;

    // Always use 64GB as maximum size per node
    const maxSizePerNode = 64;
    return Math.ceil(component.nodeSize / maxSizePerNode);
  };

  // Component configuration section with expanded options
  const renderComponentConfig = (componentName, displayName) => {
    const component = architecture.components[componentName];
    if (!component || componentName === "elasticAgent") return null;

    if (!component.enabled) return null;

    return (
      <EuiAccordion
        id={`${componentName}-config`}
        buttonContent={`${displayName} Configuration`}
        paddingSize="s"
        initialIsOpen={true}
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Availability Zones">
              <EuiSelect
                options={azCountOptions}
                value={component.azCount?.toString()}
                onChange={(e) =>
                  handleComponentAZCountChange(componentName, e.target.value)
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label="Node Size"
              helpText={
                component.nodeSize > 64
                  ? `Will be split into ${calculateNodeCount(
                      component
                    )} nodes of 64GB each`
                  : null
              }
            >
              <EuiSelect
                options={nodeSizes}
                value={component.nodeSize?.toString()}
                onChange={(e) =>
                  handleComponentNodeSizeChange(componentName, e.target.value)
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    );
  };

  // Elasticsearch tier configuration
  const renderTierConfig = (tierName, displayName) => {
    const tier = architecture.components.elasticsearch.tiers[tierName];
    if (!tier.enabled) return null;

    return (
      <EuiAccordion
        id={`${tierName}-tier-config`}
        buttonContent={`${displayName} Tier Configuration`}
        paddingSize="s"
        initialIsOpen={true}
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Availability Zones">
              <EuiSelect
                options={azCountOptions}
                value={tier.azCount?.toString()}
                onChange={(e) =>
                  handleTierAZCountChange(tierName, e.target.value)
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label="Node Size"
              helpText={
                tier.nodeSize > 64
                  ? `Will be split into ${calculateNodeCount(
                      tier
                    )} nodes of 64GB each`
                  : null
              }
            >
              <EuiSelect
                options={nodeSizes}
                value={tier.nodeSize?.toString()}
                onChange={(e) =>
                  handleTierNodeSizeChange(tierName, e.target.value)
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    );
  };

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="s">
        <h2>Deployment Configuration</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiForm component="form">
        <EuiTitle size="xs">
          <h3>Components</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        {/* Elasticsearch */}
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            label="Elasticsearch"
            checked={architecture.components.elasticsearch.enabled}
            onChange={() => handleComponentToggle("elasticsearch")}
          />
        </EuiFormRow>

        {architecture.components.elasticsearch.enabled && (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <p>Elasticsearch Tiers</p>
              </EuiText>
            </EuiFlexItem>

            {/* Hot Tier */}
            <EuiFlexItem grow={false}>
              <EuiFormRow hasChildLabel={false}>
                <EuiSwitch
                  label="Hot Tier"
                  checked={
                    architecture.components.elasticsearch.tiers.hot.enabled
                  }
                  onChange={() => handleTierToggle("hot")}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {renderTierConfig("hot", "Hot")}

            {/* Warm Tier */}
            <EuiFlexItem grow={false}>
              <EuiFormRow hasChildLabel={false}>
                <EuiSwitch
                  label="Warm Tier"
                  checked={
                    architecture.components.elasticsearch.tiers.warm.enabled
                  }
                  onChange={() => handleTierToggle("warm")}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {renderTierConfig("warm", "Warm")}

            {/* Cold Tier */}
            <EuiFlexItem grow={false}>
              <EuiFormRow hasChildLabel={false}>
                <EuiSwitch
                  label="Cold Tier"
                  checked={
                    architecture.components.elasticsearch.tiers.cold.enabled
                  }
                  onChange={() => handleTierToggle("cold")}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {renderTierConfig("cold", "Cold")}

            {/* Frozen Tier */}
            <EuiFlexItem grow={false}>
              <EuiFormRow hasChildLabel={false}>
                <EuiSwitch
                  label="Frozen Tier"
                  checked={
                    architecture.components.elasticsearch.tiers.frozen.enabled
                  }
                  onChange={() => handleTierToggle("frozen")}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {renderTierConfig("frozen", "Frozen")}

            {/* ML Nodes */}
            <EuiFlexItem grow={false}>
              <EuiFormRow hasChildLabel={false}>
                <EuiSwitch
                  label="Machine Learning Nodes"
                  checked={architecture.components.mlNodes.enabled}
                  onChange={() => handleComponentToggle("mlNodes")}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {renderComponentConfig("mlNodes", "Machine Learning")}

            {/* Enterprise Search */}
            <EuiFlexItem grow={false}>
              <EuiFormRow hasChildLabel={false}>
                <EuiSwitch
                  label="Enterprise Search"
                  checked={architecture.components.enterpriseSearch.enabled}
                  onChange={() => handleComponentToggle("enterpriseSearch")}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {renderComponentConfig("enterpriseSearch", "Enterprise Search")}
          </EuiFlexGroup>
        )}

        <EuiSpacer size="s" />
        <EuiHorizontalRule margin="xs" />

        {/* Kibana */}
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            label="Kibana"
            checked={architecture.components.kibana.enabled}
            onChange={() => handleComponentToggle("kibana")}
          />
        </EuiFormRow>
        {renderComponentConfig("kibana", "Kibana")}

        {/* Integrations Server */}
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            label="Integrations Server"
            checked={architecture.components.integrationsServer.enabled}
            onChange={() => handleComponentToggle("integrationsServer")}
          />
        </EuiFormRow>
        {renderComponentConfig("integrationsServer", "Integrations Server")}

        {/* Logstash */}
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            label="Logstash"
            checked={architecture.components.logstash.enabled}
            onChange={() => handleComponentToggle("logstash")}
          />
        </EuiFormRow>
        {renderComponentConfig("logstash", "Logstash")}

        {/* Elastic Agent */}
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            label="Elastic Agent"
            checked={architecture.components.elasticAgent.enabled}
            onChange={() => handleComponentToggle("elasticAgent")}
          />
        </EuiFormRow>

        {architecture.components.elasticAgent.enabled && (
          <EuiAccordion
            id="elasticAgent-integrations"
            buttonContent="Data Integrations"
            paddingSize="s"
            initialIsOpen={true}
          >
            <EuiFormRow
              label="Select data integrations"
              helpText="Choose from available integrations from elastic.co"
              fullWidth
            >
              <EuiComboBox
                placeholder="Select one or more integrations"
                isLoading={isLoadingIntegrations}
                options={integrations.map((integration) => ({
                  label: integration.label,
                  value: integration.value,
                  renderOption: () => (
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: integration.icon
                              ? `<img src="${integration.icon}" alt="${integration.label}" class="integration-icon" width="16" height="16" onerror="this.src='${DEFAULT_ICON_URL}';" />`
                              : `<img src="${DEFAULT_ICON_URL}" alt="${integration.label}" class="integration-icon" width="16" height="16" />`,
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>{integration.label}</EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                }))}
                selectedOptions={(
                  architecture.components.elasticAgent.selectedIntegrations ||
                  []
                ).map((integration) => {
                  const integrationObj = integrations.find(
                    (i) => i.value === integration
                  );
                  return {
                    label: integrationObj?.label || integration,
                    value: integration,
                    renderOption: () => (
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="center"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: integrationObj?.icon
                                ? `<img src="${integrationObj.icon}" alt="${
                                    integrationObj.label || integration
                                  }" class="integration-icon" width="16" height="16" onerror="this.src='${DEFAULT_ICON_URL}';" />`
                                : `<img src="${DEFAULT_ICON_URL}" alt="${
                                    integrationObj?.label || integration
                                  }" class="integration-icon" width="16" height="16" />`,
                            }}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          {integrationObj?.label || integration}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                  };
                })}
                onChange={(selectedOptions) => {
                  const selectedIntegrations = selectedOptions.map(
                    (option) => option.value
                  );
                  updateArchitecture({
                    ...architecture,
                    components: {
                      ...architecture.components,
                      elasticAgent: {
                        ...architecture.components.elasticAgent,
                        selectedIntegrations: selectedIntegrations,
                      },
                    },
                  });
                }}
                renderOption={(option, searchValue, contentClassName) => {
                  return option.renderOption
                    ? option.renderOption()
                    : option.label;
                }}
                isClearable={true}
                fullWidth
              />
            </EuiFormRow>
          </EuiAccordion>
        )}

        <EuiSpacer size="m" />
        <EuiHorizontalRule />

        <EuiTitle size="xs">
          <h3>Estimated Cluster Size</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            Total memory: <strong>{estimateClusterSize()} GB</strong>
          </p>
        </EuiText>

        <EuiSpacer size="m" />
        <EuiButtonEmpty onClick={resetForm}>Reset to Default</EuiButtonEmpty>
      </EuiForm>
    </EuiPanel>
  );
};

export default InputForm;
