import React, { useState, useEffect } from "react";
// Import the dynamic integrations fetching hook
import { useIntegrations } from "../assets/data-integrations";
// Import the deployment templates hook
import { useDeploymentTemplates } from "../assets/deployment-templates";
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

  // Fetch deployment templates dynamically using our custom hook
  const {
    templates,
    loading: isLoadingTemplates,
    error: templatesError,
    hardwareProfiles,
    cloudProviders,
    regions,
    selectedHardwareProfile,
    selectedCloudProvider,
    selectedRegion,
    setSelectedHardwareProfile,
    setSelectedCloudProvider,
    setSelectedRegion,
  } = useDeploymentTemplates();

  // Initialize environment dropdown values from architecture state
  useEffect(() => {
    // If the architecture state has environment configuration, use those values
    if (architecture.environment) {
      // Special handling for hardware profile
      if (
        architecture.environment.hardwareProfile &&
        hardwareProfiles.length > 0
      ) {
        // Check if the stored hardwareProfile exists in available profiles
        const profileExists = hardwareProfiles.some(
          (profile) =>
            profile.value === architecture.environment.hardwareProfile
        );

        if (profileExists) {
          if (
            selectedHardwareProfile !== architecture.environment.hardwareProfile
          ) {
            setSelectedHardwareProfile(
              architecture.environment.hardwareProfile
            );
          }
        } else if (hardwareProfiles.length > 0) {
          // If stored profile doesn't exist, update architecture with first available profile
          updateArchitecture({
            ...architecture,
            environment: {
              ...architecture.environment,
              hardwareProfile: hardwareProfiles[0].value,
            },
          });
        }
      }

      // Special handling for cloud provider
      if (architecture.environment.cloudProvider && cloudProviders.length > 0) {
        // Check if the stored cloudProvider exists in available providers
        const providerExists = cloudProviders.some(
          (provider) =>
            provider.value === architecture.environment.cloudProvider
        );

        if (providerExists) {
          if (
            selectedCloudProvider !== architecture.environment.cloudProvider
          ) {
            setSelectedCloudProvider(architecture.environment.cloudProvider);
          }
        } else if (cloudProviders.length > 0) {
          // If stored provider doesn't exist, update architecture with first available provider
          updateArchitecture({
            ...architecture,
            environment: {
              ...architecture.environment,
              cloudProvider: cloudProviders[0].value,
            },
          });
        }
      }

      // Special handling for region
      if (architecture.environment.region && regions.length > 0) {
        // Check if the stored region exists in available regions
        const regionExists = regions.some(
          (region) => region.value === architecture.environment.region
        );

        if (regionExists) {
          if (selectedRegion !== architecture.environment.region) {
            setSelectedRegion(architecture.environment.region);
          }
        } else if (regions.length > 0) {
          // If stored region doesn't exist or is empty, update architecture with first available region
          updateArchitecture({
            ...architecture,
            environment: {
              ...architecture.environment,
              region: regions[0].value,
            },
          });
          setSelectedRegion(regions[0].value);
        }
      } else if (regions.length > 0 && !architecture.environment.region) {
        // If no region is set but regions are available, set the first region
        updateArchitecture({
          ...architecture,
          environment: {
            ...architecture.environment,
            region: regions[0].value,
          },
        });
        setSelectedRegion(regions[0].value);
      }
    }
  }, [
    architecture.environment,
    hardwareProfiles,
    cloudProviders,
    regions,
    updateArchitecture,
    selectedHardwareProfile,
    selectedCloudProvider,
    selectedRegion,
    setSelectedHardwareProfile,
    setSelectedCloudProvider,
    setSelectedRegion,
  ]);

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
      environment: {
        hardwareProfile: "general-purpose", // Default hardware profile
        cloudProvider: "aws", // Default cloud provider
        region: regions.length > 0 ? regions[0].value : "", // First available region
      },
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

  // Environment configuration section
  const renderEnvironmentConfig = () => {
    return (
      <EuiAccordion
        id="environment-config"
        buttonContent="Environment Configuration"
        paddingSize="s"
        initialIsOpen={true}
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Deployment Template">
              <EuiSelect
                options={
                  templates && templates.length > 0
                    ? templates.map((template) => ({
                        value: template.template_category_id,
                        text: template.name || template.template_category_id,
                      }))
                    : []
                }
                isLoading={isLoadingTemplates}
                onChange={(e) =>
                  updateArchitecture({
                    ...architecture,
                    deploymentTemplate: e.target.value,
                  })
                }
                value={architecture.deploymentTemplate}
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
        {/* Environment Configuration */}
        <EuiTitle size="xs">
          <h3>Environment Configuration</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        {isLoadingTemplates ? (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText size="s">Loading deployment templates...</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : templatesError ? (
          <EuiText color="danger" size="s">
            Error loading deployment templates: {templatesError}
          </EuiText>
        ) : (
          <>
            {/* Hardware Profile Dropdown */}
            <EuiFormRow
              label="Hardware Profile"
              helpText="Select the hardware profile for your deployment"
            >
              <EuiSelect
                options={hardwareProfiles}
                value={selectedHardwareProfile}
                onChange={(e) => {
                  setSelectedHardwareProfile(e.target.value);
                  // Update architecture state with selected hardware profile
                  updateArchitecture({
                    ...architecture,
                    environment: {
                      ...architecture.environment,
                      hardwareProfile: e.target.value,
                    },
                  });
                }}
                aria-label="Select Hardware Profile"
              />
            </EuiFormRow>

            {/* Cloud Provider Dropdown */}
            <EuiFormRow
              label="Cloud Provider"
              helpText="Select the cloud provider for your deployment"
            >
              <EuiSelect
                options={cloudProviders}
                value={selectedCloudProvider}
                onChange={(e) => {
                  setSelectedCloudProvider(e.target.value);
                  // Update architecture state with selected cloud provider
                  updateArchitecture({
                    ...architecture,
                    environment: {
                      ...architecture.environment,
                      cloudProvider: e.target.value,
                    },
                  });
                }}
                aria-label="Select Cloud Provider"
                isDisabled={cloudProviders.length === 0}
              />
            </EuiFormRow>

            {/* Region Dropdown */}
            <EuiFormRow
              label="Region"
              helpText="Select the region for your deployment"
            >
              <EuiSelect
                options={regions}
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  // Update architecture state with selected region
                  updateArchitecture({
                    ...architecture,
                    environment: {
                      ...architecture.environment,
                      region: e.target.value,
                    },
                  });
                }}
                aria-label="Select Region"
                isDisabled={regions.length === 0}
              />
            </EuiFormRow>
          </>
        )}

        <EuiSpacer size="m" />

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

        {/* Data Collection Section */}
        <EuiSpacer size="m" />
        <EuiTitle size="xs">
          <h3>Data Collection</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

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

        {/* Environment Configuration */}
        {renderEnvironmentConfig()}

        <EuiSpacer size="m" />
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
