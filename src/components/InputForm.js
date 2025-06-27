import React, { useState, useEffect, useRef, useCallback } from "react";
// Import the dynamic integrations fetching hook
import { useIntegrations } from "../assets/data-integrations.js";
// Import our cached deployment templates hook
import useCachedDeploymentTemplates from "../assets/use-cached-deployment-templates.js";
// Import the instance configurations utilities
import {
  formatSize,
  calculateStorageSizeGB,
  calculateCPUCount,
} from "../assets/instance-configurations.js";
// Import the default icon URL
import { DEFAULT_ICON_URL } from "../assets/integration-icon-urls.js";
// Import the ETL tools hook
import { useEtlTools } from "../assets/etl-tools.js";
// Import component styles
import "./InputForm.css";
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
  EuiBadge,
  EuiButtonIcon,
  EuiFieldText,
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

  // Get ETL tools using our custom hook
  const { tools: etlTools } = useEtlTools();

  // Fetch deployment templates dynamically using our cached deployment templates hook
  const {
    templates,
    loading: isLoadingTemplates,
    error: templatesError,
    hardwareProfiles,
    cloudProviders,
    regions,
    nodeSizes: dynamicNodeSizes,
    instanceConfigurations,
    loading: isLoadingInstanceConfig,
    error: instanceConfigError,
    selectedHardwareProfile,
    selectedCloudProvider,
    selectedRegion,
    updateHardwareProfile,
    updateCloudProvider,
    updateRegion,
  } = useCachedDeploymentTemplates();

  // Add a ref to track component changes to avoid triggering unnecessary updates
  const componentChangingRef = useRef(false);

  // Session restoration is now handled by our cached deployment templates hook
  // No need for a separate effect here

  // Initialize environment dropdown values from architecture state
  // Avoid resetting hardware profile when it's manually changed
  const initializedRef = useRef(false);

  // Sync architecture state with environment settings
  useEffect(() => {
    // Skip if no profiles loaded yet or in the middle of a component toggle
    if (
      hardwareProfiles.length === 0 ||
      !architecture.environment ||
      componentChangingRef.current
    ) {
      return;
    }

    // Create a batched update to minimize renders
    const needsUpdate =
      !initializedRef.current ||
      architecture.environment.hardwareProfile !== selectedHardwareProfile ||
      architecture.environment.cloudProvider !== selectedCloudProvider ||
      architecture.environment.region !== selectedRegion;

    if (needsUpdate) {
      console.log("Synchronizing environment state with architecture");

      // Create a single update with all environment changes
      const updatedArchitecture = {
        ...architecture,
        environment: {
          ...architecture.environment,
          hardwareProfile: selectedHardwareProfile,
          cloudProvider: selectedCloudProvider,
          region: selectedRegion,
        },
      };

      // Only update if something changed
      if (
        !initializedRef.current ||
        architecture.environment.hardwareProfile !==
          updatedArchitecture.environment.hardwareProfile ||
        architecture.environment.cloudProvider !==
          updatedArchitecture.environment.cloudProvider ||
        architecture.environment.region !==
          updatedArchitecture.environment.region
      ) {
        console.log(
          "Environment settings changed, updating architecture state"
        );
        updateArchitecture(updatedArchitecture);
      }

      // Mark as initialized
      initializedRef.current = true;
    }
  }, [
    architecture,
    hardwareProfiles,
    selectedHardwareProfile,
    selectedCloudProvider,
    selectedRegion,
    updateArchitecture,
  ]);

  const handleComponentToggle = (componentName) => {
    // Set flag to indicate we're toggling a component
    componentChangingRef.current = true;
    console.log(
      `Toggling component ${componentName}, setting componentChangingRef to true`
    );

    // Create updated state with the component toggled
    const updatedArchitecture = { ...architecture };

    if (componentName === "elasticsearch") {
      updatedArchitecture.components = {
        ...updatedArchitecture.components,
        elasticsearch: {
          ...updatedArchitecture.components.elasticsearch,
          enabled: !updatedArchitecture.components.elasticsearch.enabled,
        },
      };
    } else {
      updatedArchitecture.components = {
        ...updatedArchitecture.components,
        [componentName]: {
          ...updatedArchitecture.components[componentName],
          enabled: !updatedArchitecture.components[componentName].enabled,
        },
      };
    }

    // Update the architecture
    updateArchitecture(updatedArchitecture);

    // Reset the flag after a longer delay to ensure all updates have completed
    setTimeout(() => {
      console.log(
        `Component toggle complete for ${componentName}, resetting componentChangingRef to false`
      );
      componentChangingRef.current = false;
    }, 500);
  };

  const handleTierToggle = (tier) => {
    // Set flag to indicate we're toggling a component
    componentChangingRef.current = true;
    console.log(
      `Toggling Elasticsearch tier ${tier}, setting componentChangingRef to true`
    );

    // Create updated state with the tier toggled
    const updatedArchitecture = {
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
    };

    // Update the architecture
    updateArchitecture(updatedArchitecture);

    // Reset the flag after a longer delay to ensure all updates have completed
    setTimeout(() => {
      console.log(
        `Tier toggle complete for ${tier}, resetting componentChangingRef to false`
      );
      componentChangingRef.current = false;
    }, 500);
  };

  // State to track which agent sections are collapsed

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

  const handleTierNodeSizeChange = (tierName, value) => {
    const sizeValue = parseInt(value, 10);

    // Get the storage and CPU multipliers from the dynamic node sizes if available
    const tierConfig = dynamicNodeSizes[`elasticsearch.${tierName}`];
    const storageMultiplier = tierConfig?.storageMultiplier || 1.0;
    const cpuMultiplier = tierConfig?.cpuMultiplier || 0.1;
    const configId = tierConfig?.configId;

    updateArchitecture({
      ...architecture,
      components: {
        ...architecture.components,
        elasticsearch: {
          ...architecture.components.elasticsearch,
          tiers: {
            ...architecture.components.elasticsearch.tiers,
            [tierName]: {
              ...architecture.components.elasticsearch.tiers[tierName],
              nodeSize: sizeValue,
              cpuValue: Math.round(sizeValue * cpuMultiplier * 10) / 10,
              memoryValue: sizeValue,
              storageValue: Math.round(sizeValue * storageMultiplier),
              instanceConfigId: configId || undefined,
            },
          },
        },
      },
    });
  };

  const handleComponentNodeSizeChange = (componentName, value) => {
    const sizeValue = parseInt(value, 10);

    // Get the storage and CPU multipliers from the dynamic node sizes if available
    const componentConfig = dynamicNodeSizes[componentName];
    const storageMultiplier = componentConfig?.storageMultiplier || 1.0;
    const cpuMultiplier = componentConfig?.cpuMultiplier || 0.1;
    const configId = componentConfig?.configId;

    updateArchitecture({
      ...architecture,
      components: {
        ...architecture.components,
        [componentName]: {
          ...architecture.components[componentName],
          nodeSizeValue: sizeValue,
          cpuValue: Math.round(sizeValue * cpuMultiplier * 10) / 10,
          memoryValue: sizeValue,
          storageValue: Math.round(sizeValue * storageMultiplier),
          instanceConfigId: configId || undefined,
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
        logstashInstances: [
          {
            id: "logstash1",
            enabled: false,
            name: "Logstash 1",
          },
        ],
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

      // Skip components that don't have node sizes
      if (
        componentName === "elasticAgent" ||
        componentName === "etlQueueTools" ||
        componentName === "logstashInstances" ||
        componentName === "elasticAgents"
      )
        return;

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
        // Only calculate if component has azCount and nodeSize properties
        if (component.azCount && component.nodeSize) {
          totalSize += component.azCount * component.nodeSize;
        }
      }
    });

    return totalSize;
  };

  // Calculate resources for a specific Elasticsearch tier
  const calculateTierResources = (tierName) => {
    const tier = architecture.components.elasticsearch.tiers[tierName];
    if (!tier || !tier.enabled) return { ram: 0, disk: 0, cpu: 0 };

    const totalRam = tier.azCount * tier.nodeSize;
    const totalDisk = calculateStorageSizeGB(
      totalRam * 1024,
      tier.storageMultiplier
    );
    const totalCpu = calculateCPUCount(totalRam * 1024, tier.cpuMultiplier);

    return {
      ram: totalRam,
      disk: totalDisk,
      cpu: totalCpu.toFixed(1),
    };
  };

  // Calculate resources for a non-Elasticsearch component
  const calculateComponentResources = (componentName) => {
    const component = architecture.components[componentName];
    if (!component || !component.enabled) return { ram: 0, disk: 0, cpu: 0 };

    const totalRam = component.azCount * component.nodeSize;
    const totalDisk = calculateStorageSizeGB(
      totalRam * 1024,
      component.storageMultiplier || 1.0
    );
    const totalCpu = calculateCPUCount(
      totalRam * 1024,
      component.cpuMultiplier || 0.1
    );

    return {
      ram: totalRam,
      disk: totalDisk,
      cpu: totalCpu.toFixed(1),
    };
  };

  // Calculate overall storage capacity across all Elasticsearch tiers only
  const calculateTotalStorageCapacity = () => {
    let totalStorage = 0;

    // Calculate storage for Elasticsearch tiers only
    if (architecture.components.elasticsearch.enabled) {
      const tierNames = ["hot", "warm", "cold", "frozen"];

      tierNames.forEach((tierName) => {
        const tier = architecture.components.elasticsearch.tiers[tierName];
        if (tier && tier.enabled) {
          const tierRam = tier.azCount * tier.nodeSize;
          totalStorage += calculateStorageSizeGB(
            tierRam * 1024,
            tier.storageMultiplier
          );
        }
      });
    }

    return totalStorage;
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

    // Use dynamic node sizes if available for this component
    const dynamicSizes = dynamicNodeSizes[componentName];

    // Generate node size options based on available dynamic sizes or fallback to standard sizes
    let componentNodeSizes = nodeSizes;
    if (dynamicSizes && dynamicSizes.sizes) {
      componentNodeSizes = dynamicSizes.sizes.map((size) => ({
        value: size.toString(),
        text: formatSize(size),
      }));
    }

    // If we have dynamic sizes but the current selected size isn't in the list,
    // update to use the default size from the template
    if (
      dynamicSizes &&
      dynamicSizes.sizes &&
      !dynamicSizes.sizes.includes(component.nodeSize * 1024) && // Convert GB to MB for comparison
      dynamicSizes.defaultSize &&
      !componentChangingRef.current // Only update if not in the middle of a component toggle
    ) {
      // Set the changing ref to prevent loops
      componentChangingRef.current = true;
      console.log(
        `Updating node size for ${componentName} to default size ${
          dynamicSizes.defaultSize / 1024
        }GB`
      );

      // Schedule an update to use the default size
      setTimeout(() => {
        handleComponentNodeSizeChange(
          componentName,
          dynamicSizes.defaultSize / 1024
        ); // Convert MB to GB

        // Reset the changing ref after update
        setTimeout(() => {
          componentChangingRef.current = false;
        }, 500);
      }, 0);
    }

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
                options={componentNodeSizes}
                value={(component.nodeSize * 1024).toString()} // Convert to MB if using dynamic sizes
                onChange={(e) => {
                  // Convert from MB to GB if using dynamic sizes
                  const value = dynamicSizes
                    ? parseInt(e.target.value) / 1024
                    : e.target.value;
                  handleComponentNodeSizeChange(componentName, value);
                }}
                isLoading={isLoadingInstanceConfig}
                isDisabled={isLoadingInstanceConfig}
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

    // Use dynamic node sizes if available for this tier
    const dynamicSizes = dynamicNodeSizes[`elasticsearch.${tierName}`];

    // Generate node size options based on available dynamic sizes or fallback to standard sizes
    let tierNodeSizes = nodeSizes;
    if (dynamicSizes && dynamicSizes.sizes) {
      tierNodeSizes = dynamicSizes.sizes.map((size) => ({
        value: size.toString(),
        text: formatSize(size),
      }));
    }

    // If we have dynamic sizes but the current selected size isn't in the list,
    // update to use the default size from the template
    if (
      dynamicSizes &&
      dynamicSizes.sizes &&
      !dynamicSizes.sizes.includes(tier.nodeSize * 1024) && // Convert GB to MB for comparison
      dynamicSizes.defaultSize &&
      !componentChangingRef.current // Only update if not in the middle of a component toggle
    ) {
      // Set the changing ref to prevent loops
      componentChangingRef.current = true;
      console.log(
        `Updating node size for ${tierName} tier to default size ${
          dynamicSizes.defaultSize / 1024
        }GB`
      );

      // Schedule an update to use the default size
      setTimeout(() => {
        handleTierNodeSizeChange(tierName, dynamicSizes.defaultSize / 1024); // Convert MB to GB

        // Reset the changing ref after update
        setTimeout(() => {
          componentChangingRef.current = false;
        }, 500);
      }, 0);
    }

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
                options={tierNodeSizes}
                value={(tier.nodeSize * 1024).toString()} // Convert to MB if using dynamic sizes
                onChange={(e) => {
                  // Convert from MB to GB if using dynamic sizes
                  const value = dynamicSizes
                    ? parseInt(e.target.value) / 1024
                    : e.target.value;
                  handleTierNodeSizeChange(tierName, value);
                }}
                isLoading={isLoadingInstanceConfig}
                isDisabled={isLoadingInstanceConfig}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    );
  };

  // Environment configuration section removed as requested

  // State to track which agent sections are collapsed
  const [collapsedAgentSections, setCollapsedAgentSections] = useState({});

  // Toggle collapsed state for a specific agent
  const toggleAgentSection = (agentId) => {
    setCollapsedAgentSections((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };

  // Update all instance configuration IDs from the dynamic node sizes
  const updateAllInstanceConfigIds = () => {
    // Check if we have any dynamic node sizes to work with
    if (Object.keys(dynamicNodeSizes).length === 0) {
      console.log(
        "No dynamic node sizes available yet, skipping instance config ID update"
      );
      return;
    }

    // Skip if we're in the middle of a component toggle to prevent loops
    if (componentChangingRef.current) {
      console.log("Skipping instance config ID update during component change");
      return;
    }

    // Verify we have the correct environment settings
    console.log("Updating instance configuration IDs from deployment template");
    console.log(
      `Current cloud provider: ${selectedCloudProvider}, region: ${selectedRegion}, hardware profile: ${selectedHardwareProfile}`
    );

    // Verify environment in architecture matches our hook state
    if (architecture.environment?.cloudProvider !== selectedCloudProvider) {
      console.warn(
        `Warning: Architecture cloud provider (${architecture.environment?.cloudProvider}) doesn't match hook state (${selectedCloudProvider})`
      );
    }

    if (architecture.environment?.region !== selectedRegion) {
      console.warn(
        `Warning: Architecture region (${architecture.environment?.region}) doesn't match hook state (${selectedRegion})`
      );
    }

    // Track if any changes are actually made
    let hasChanges = false;

    // Create a copy of the architecture state
    const updatedArchitecture = { ...architecture };

    // Update Elasticsearch tiers
    if (updatedArchitecture.components.elasticsearch) {
      const tiers = updatedArchitecture.components.elasticsearch.tiers;
      if (tiers) {
        Object.keys(tiers).forEach((tierName) => {
          const tierConfig = dynamicNodeSizes[`elasticsearch.${tierName}`];
          if (tierConfig?.configId) {
            // Only update if the ID has actually changed
            if (tiers[tierName].instanceConfigId !== tierConfig.configId) {
              tiers[tierName].instanceConfigId = tierConfig.configId;
              console.log(
                `Updated ${tierName} tier instanceConfigId to ${tierConfig.configId}`
              );
              hasChanges = true;
            }
          } else {
            console.log(`No configId found for ${tierName} tier`);
          }
        });
      }
    }

    // Update other components (mlNodes, kibana, enterpriseSearch, integrationsServer)
    const componentsToUpdate = [
      "mlNodes",
      "kibana",
      "enterpriseSearch",
      "integrationsServer",
    ];
    componentsToUpdate.forEach((componentName) => {
      if (updatedArchitecture.components[componentName]) {
        const componentConfig = dynamicNodeSizes[componentName];
        if (componentConfig?.configId) {
          // Only update if the ID has actually changed
          if (
            updatedArchitecture.components[componentName].instanceConfigId !==
            componentConfig.configId
          ) {
            updatedArchitecture.components[componentName].instanceConfigId =
              componentConfig.configId;
            console.log(
              `Updated ${componentName} instanceConfigId to ${componentConfig.configId}`
            );
            hasChanges = true;
          }
        } else {
          console.log(`No configId found for ${componentName}`);
        }
      }
    });

    // Only update architecture if something actually changed
    if (hasChanges) {
      console.log(
        "Detected changes to instance config IDs, updating architecture"
      );
      updateArchitecture(updatedArchitecture);
    } else {
      console.log("No changes to instance config IDs needed");
    }
  };

  // Add a debounce ref to prevent rapid consecutive updates
  const pendingUpdateRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);

  // Update instance configuration IDs when dynamic node sizes are loaded
  useEffect(() => {
    // Skip if we're during a component toggle or don't have node sizes
    if (Object.keys(dynamicNodeSizes).length === 0) {
      return;
    }

    // Skip if we're in the middle of a component toggle
    if (componentChangingRef.current) {
      console.log(
        "Dynamic node sizes changed, but skipping update during component change"
      );
      return;
    }

    // Check if we've updated recently to prevent rapid consecutive updates
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 1000) {
      // At least 1 second between updates
      console.log(
        "Throttling instance config ID updates, too many updates in a short time"
      );

      // Clear any pending update
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }

      // Schedule a new update
      pendingUpdateRef.current = setTimeout(() => {
        if (!componentChangingRef.current) {
          console.log("Running throttled instance config ID update");
          lastUpdateTimeRef.current = Date.now();
          updateAllInstanceConfigIds();
        }
      }, 1000);

      return;
    }

    // Standard update path
    console.log(
      "Dynamic node sizes changed, updating instance configuration IDs"
    );
    lastUpdateTimeRef.current = now;

    // Keep track of the timeout ID
    pendingUpdateRef.current = setTimeout(() => {
      // Double-check we're not in a component change before proceeding
      if (!componentChangingRef.current) {
        updateAllInstanceConfigIds();
      } else {
        console.log(
          "Skipping instance config update due to active component change"
        );
      }
    }, 500); // Longer timeout to ensure other state changes complete first

    // Clean up the timeout if the component unmounts or the effect runs again
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, [dynamicNodeSizes]); // architecture and updateAllInstanceConfigIds are intentionally omitted to prevent infinite loops

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
                  const newProfile = e.target.value;
                  console.log(`Hardware profile changed to: ${newProfile}`);

                  // Block other environment changes during this update
                  componentChangingRef.current = true;

                  // First update the local state
                  updateHardwareProfile(newProfile);

                  // Then update the architecture state
                  const updatedArchitecture = {
                    ...architecture,
                    environment: {
                      ...architecture.environment,
                      hardwareProfile: newProfile,
                    },
                  };
                  updateArchitecture(updatedArchitecture);

                  // Store this selection in sessionStorage to make it persist
                  try {
                    sessionStorage.setItem(
                      "selectedHardwareProfile",
                      newProfile
                    );
                  } catch (error) {
                    console.warn(
                      "Failed to store hardware profile in sessionStorage:",
                      error
                    );
                  }

                  // Clear the change flag after a short delay
                  setTimeout(() => {
                    componentChangingRef.current = false;

                    // Update instance configuration IDs after hardware profile changes
                    console.log(
                      `Updating instance config IDs for profile: ${newProfile}`
                    );
                    updateAllInstanceConfigIds();
                  }, 150);
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
                  const newProvider = e.target.value;
                  console.log(`Cloud provider changed to: ${newProvider}`);

                  // Block other environment changes during this update
                  componentChangingRef.current = true;

                  // First update the local state via our custom hook - this should trigger template refresh
                  updateCloudProvider(newProvider);

                  console.log(
                    `Cloud provider updated, regions should refresh automatically`
                  );

                  // Then update the architecture state
                  const updatedArchitecture = {
                    ...architecture,
                    environment: {
                      ...architecture.environment,
                      cloudProvider: newProvider,
                    },
                  };
                  updateArchitecture(updatedArchitecture);

                  // Use a longer delay for the component changing flag to allow templates to update
                  setTimeout(() => {
                    console.log(
                      `Setting componentChangingRef to false after cloud provider change`
                    );
                    componentChangingRef.current = false;

                    // Update instance configuration IDs after cloud provider changes
                    console.log(
                      `Updating instance config IDs for cloud provider: ${newProvider}`
                    );
                    updateAllInstanceConfigIds();
                  }, 500); // Increased timeout to allow for template fetch
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
                  const newRegion = e.target.value;
                  console.log(`Region changed to: ${newRegion}`);

                  // Block other environment changes during this update
                  componentChangingRef.current = true;

                  // First update the local state
                  updateRegion(newRegion);

                  // Then update the architecture state
                  const updatedArchitecture = {
                    ...architecture,
                    environment: {
                      ...architecture.environment,
                      region: newRegion,
                    },
                  };
                  updateArchitecture(updatedArchitecture);

                  // Store this selection in sessionStorage to make it persist
                  try {
                    sessionStorage.setItem("selectedRegion", newRegion);
                  } catch (error) {
                    console.warn(
                      "Failed to store region in sessionStorage:",
                      error
                    );
                  }

                  // Clear the change flag after a short delay
                  setTimeout(() => {
                    componentChangingRef.current = false;

                    // Update instance configuration IDs after region changes
                    console.log(
                      `Updating instance config IDs for region: ${newRegion}`
                    );
                    updateAllInstanceConfigIds();
                  }, 150);
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

        {/* Logstash Instances */}
        <EuiFormRow
          label="Logstash Instances"
          helpText="Create and manage your Logstash instances"
        >
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={true}>
              {/* Empty flex item to push button to the right */}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="plusInCircle"
                onClick={() => {
                  const newLogstashId = `logstash${
                    architecture.components.logstashInstances.length + 1
                  }`;
                  const newLogstash = {
                    id: newLogstashId,
                    enabled: true,
                    name: `Logstash ${
                      architecture.components.logstashInstances.length + 1
                    }`,
                  };

                  updateArchitecture({
                    ...architecture,
                    components: {
                      ...architecture.components,
                      logstashInstances: [
                        ...architecture.components.logstashInstances,
                        newLogstash,
                      ],
                    },
                  });
                }}
              >
                Add Logstash Instance
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {/* Render each Logstash instance with its configuration */}
        {architecture.components.logstashInstances.map(
          (logstashInstance, index) => (
            <div
              key={logstashInstance.id}
              className={`logstash-instance-config-container ${
                !logstashInstance.enabled ? "disabled" : ""
              }`}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label="Enabled"
                    checked={logstashInstance.enabled}
                    onChange={() => {
                      const updatedInstances = [
                        ...architecture.components.logstashInstances,
                      ];
                      updatedInstances[index].enabled =
                        !updatedInstances[index].enabled;

                      updateArchitecture({
                        ...architecture,
                        components: {
                          ...architecture.components,
                          logstashInstances: updatedInstances,
                        },
                      });
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    value={logstashInstance.name}
                    onChange={(e) => {
                      const updatedInstances = [
                        ...architecture.components.logstashInstances,
                      ];
                      updatedInstances[index].name = e.target.value;

                      updateArchitecture({
                        ...architecture,
                        components: {
                          ...architecture.components,
                          logstashInstances: updatedInstances,
                        },
                      });
                    }}
                    disabled={!logstashInstance.enabled}
                  />
                </EuiFlexItem>
                {index > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="cross"
                      color="danger"
                      onClick={() => {
                        // Remove this Logstash instance
                        const updatedInstances =
                          architecture.components.logstashInstances.filter(
                            (_, i) => i !== index
                          );

                        // Update any agent routing that was using this Logstash instance
                        const updatedAgents =
                          architecture.components.elasticAgents.map((agent) => {
                            if (
                              agent.dataRouting ===
                              `logstash:${logstashInstance.id}`
                            ) {
                              return { ...agent, dataRouting: "direct" };
                            }
                            return agent;
                          });

                        updateArchitecture({
                          ...architecture,
                          components: {
                            ...architecture.components,
                            logstashInstances: updatedInstances,
                            elasticAgents: updatedAgents,
                          },
                        });
                      }}
                      aria-label={`Remove ${logstashInstance.name}`}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </div>
          )
        )}

        {/* ETL & Queuing Tools */}
        <EuiFormRow
          label="ETL & Queuing Tools"
          helpText="Create and manage ETL and Queue processing tools"
        >
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={true}>
              {/* Empty flex item to push button to the right */}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="plusInCircle"
                onClick={() => {
                  const newToolId = `etl${
                    architecture.components.etlQueueTools.length + 1
                  }`;
                  const newTool = {
                    id: newToolId,
                    enabled: true,
                    name: `ETL Tool ${
                      architecture.components.etlQueueTools.length + 1
                    }`,
                    toolType: "",
                  };

                  updateArchitecture({
                    ...architecture,
                    components: {
                      ...architecture.components,
                      etlQueueTools: [
                        ...architecture.components.etlQueueTools,
                        newTool,
                      ],
                    },
                  });
                }}
              >
                Add ETL/Queue Tool
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {/* Render each ETL/Queue tool with its configuration */}
        {architecture.components.etlQueueTools.map((tool, index) => (
          <div
            key={tool.id}
            className={`etl-tool-config-container ${
              !tool.enabled ? "disabled" : ""
            }`}
          >
            <EuiHorizontalRule margin="xs" />

            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label="Enabled"
                  checked={tool.enabled}
                  onChange={() => {
                    const updatedTools = [
                      ...architecture.components.etlQueueTools,
                    ];
                    updatedTools[index].enabled = !updatedTools[index].enabled;

                    updateArchitecture({
                      ...architecture,
                      components: {
                        ...architecture.components,
                        etlQueueTools: updatedTools,
                      },
                    });
                  }}
                />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFieldText
                  placeholder="Tool Name"
                  value={tool.name}
                  onChange={(e) => {
                    const updatedTools = [
                      ...architecture.components.etlQueueTools,
                    ];
                    updatedTools[index].name = e.target.value;

                    updateArchitecture({
                      ...architecture,
                      components: {
                        ...architecture.components,
                        etlQueueTools: updatedTools,
                      },
                    });
                  }}
                  aria-label="Tool name"
                />
              </EuiFlexItem>

              {index > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    aria-label="Remove tool"
                    iconType="cross"
                    color="danger"
                    onClick={() => {
                      const updatedTools =
                        architecture.components.etlQueueTools.filter(
                          (_, i) => i !== index
                        );

                      updateArchitecture({
                        ...architecture,
                        components: {
                          ...architecture.components,
                          etlQueueTools: updatedTools,
                        },
                      });
                    }}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            {tool.enabled && (
              <EuiFormRow
                label="Select ETL/Queuing Tool Type"
                helpText="Choose the type of ETL or queuing tool"
                fullWidth
              >
                <EuiComboBox
                  placeholder="Select an ETL or queuing tool"
                  singleSelection={{ asPlainText: true }}
                  options={etlTools.map((etlTool) => ({
                    label: etlTool.name,
                    value: etlTool.id,
                    renderOption: () => (
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="center"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: etlTool.icon
                                ? `<img src="${etlTool.icon}" alt="${etlTool.name}" class="integration-icon" width="16" height="16" onerror="this.src='${DEFAULT_ICON_URL}';" />`
                                : `<img src="${DEFAULT_ICON_URL}" alt="${etlTool.name}" class="integration-icon" width="16" height="16" />`,
                            }}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>{etlTool.name}</EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow">{etlTool.category}</EuiBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                  }))}
                  selectedOptions={(() => {
                    if (!tool.toolType) return [];
                    const etlTool = etlTools.find(
                      (t) => t.id === tool.toolType
                    );
                    if (!etlTool) return [];
                    return [
                      {
                        label: etlTool.name,
                        value: etlTool.id,
                        renderOption: () => (
                          <EuiFlexGroup
                            gutterSize="s"
                            alignItems="center"
                            responsive={false}
                          >
                            <EuiFlexItem grow={false}>
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: etlTool.icon
                                    ? `<img src="${etlTool.icon}" alt="${etlTool.name}" class="integration-icon" width="16" height="16" onerror="this.src='${DEFAULT_ICON_URL}';" />`
                                    : `<img src="${DEFAULT_ICON_URL}" alt="${etlTool.name}" class="integration-icon" width="16" height="16" />`,
                                }}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem>{etlTool.name}</EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiBadge color="hollow">
                                {etlTool.category}
                              </EuiBadge>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        ),
                      },
                    ];
                  })()}
                  onChange={(selectedOptions) => {
                    const updatedTools = [
                      ...architecture.components.etlQueueTools,
                    ];
                    updatedTools[index].toolType =
                      selectedOptions.length > 0
                        ? selectedOptions[0].value
                        : "";

                    updateArchitecture({
                      ...architecture,
                      components: {
                        ...architecture.components,
                        etlQueueTools: updatedTools,
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
            )}
          </div>
        ))}

        {/* Multiple Elastic Agents */}
        <EuiFormRow
          label="Elastic Agents"
          helpText="Create and manage your Elastic Agents for data collection"
        >
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={true}>
              {/* Empty flex item to push button to the right */}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="plusInCircle"
                onClick={() => {
                  const newAgentId = `agent${
                    architecture.components.elasticAgents.length + 1
                  }`;
                  const newAgent = {
                    id: newAgentId,
                    enabled: true,
                    name: `Elastic Agent ${
                      architecture.components.elasticAgents.length + 1
                    }`,
                    selectedIntegrations: [],
                    selectedEtlTools: [],

                    dataRouting: "direct",
                  };

                  updateArchitecture({
                    ...architecture,
                    components: {
                      ...architecture.components,
                      elasticAgents: [
                        ...architecture.components.elasticAgents,
                        newAgent,
                      ],
                    },
                  });
                }}
              >
                Add Agent
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {/* Render each agent with its configuration */}
        {architecture.components.elasticAgents.map((agent, index) => (
          <div
            key={agent.id}
            className={`agent-config-container ${
              !agent.enabled ? "disabled" : ""
            }`}
          >
            <EuiHorizontalRule margin="xs" />

            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label="Enabled"
                  checked={agent.enabled}
                  onChange={() => {
                    const updatedAgents = [
                      ...architecture.components.elasticAgents,
                    ];
                    updatedAgents[index].enabled =
                      !updatedAgents[index].enabled;

                    updateArchitecture({
                      ...architecture,
                      components: {
                        ...architecture.components,
                        elasticAgents: updatedAgents,
                      },
                    });
                  }}
                />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFieldText
                  placeholder="Agent Name"
                  value={agent.name}
                  onChange={(e) => {
                    const updatedAgents = [
                      ...architecture.components.elasticAgents,
                    ];
                    updatedAgents[index].name = e.target.value;

                    updateArchitecture({
                      ...architecture,
                      components: {
                        ...architecture.components,
                        elasticAgents: updatedAgents,
                      },
                    });
                  }}
                  aria-label="Agent name"
                />
              </EuiFlexItem>

              {index > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    aria-label="Remove agent"
                    iconType="cross"
                    color="danger"
                    onClick={() => {
                      const updatedAgents =
                        architecture.components.elasticAgents.filter(
                          (_, i) => i !== index
                        );

                      updateArchitecture({
                        ...architecture,
                        components: {
                          ...architecture.components,
                          elasticAgents: updatedAgents,
                        },
                      });
                    }}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            {agent.enabled && (
              <>
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  responsive={false}
                >
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h4>
                        <EuiButtonIcon
                          aria-label={
                            collapsedAgentSections[agent.id]
                              ? "Expand details"
                              : "Collapse details"
                          }
                          title={
                            collapsedAgentSections[agent.id]
                              ? "Expand details"
                              : "Collapse details"
                          }
                          iconType={
                            collapsedAgentSections[agent.id]
                              ? "arrowRight"
                              : "arrowDown"
                          }
                          onClick={() => toggleAgentSection(agent.id)}
                          color="primary"
                          className="agent-collapse-toggle"
                        />
                        Details
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />

                {collapsedAgentSections[agent.id] &&
                  agent.selectedIntegrations?.length > 0 && (
                    <div className="agent-summary">
                      <p>
                        <strong>Data Routing:</strong>{" "}
                        {agent.dataRouting === "direct"
                          ? "Direct to Elasticsearch"
                          : agent.dataRouting?.startsWith("logstash:")
                          ? `Via Logstash (${
                              architecture.components.logstashInstances.find(
                                (l) => `logstash:${l.id}` === agent.dataRouting
                              )?.name || "Logstash"
                            })`
                          : `Via ETL (${
                              architecture.components.etlQueueTools.find(
                                (t) => `etl:${t.id}` === agent.dataRouting
                              )?.name || "ETL Tool"
                            })`}
                      </p>
                      <p>
                        <strong>Integrations:</strong>{" "}
                        {agent.selectedIntegrations?.length || 0} enabled
                      </p>
                    </div>
                  )}

                {!collapsedAgentSections[agent.id] && (
                  <>
                    <EuiAccordion
                      id={`${agent.id}-data-routing`}
                      buttonContent="Data Routing"
                      paddingSize="s"
                      initialIsOpen={true}
                    >
                      <EuiFormRow
                        label="Select how data should be routed"
                        helpText="Choose the data path for this Elastic Agent"
                      >
                        <EuiSelect
                          options={[
                            {
                              value: "direct",
                              text: "Direct to Elasticsearch",
                            },
                            ...architecture.components.logstashInstances
                              .filter((instance) => instance.enabled)
                              .map((instance) => ({
                                value: `logstash:${instance.id}`,
                                text: `Via ${instance.name}`,
                              })),
                            ...architecture.components.etlQueueTools
                              .filter((tool) => tool.enabled && tool.toolType)
                              .map((tool) => ({
                                value: `etl:${tool.id}`,
                                text: `Via ${tool.name}`,
                              })),
                          ]}
                          value={agent.dataRouting || "direct"}
                          onChange={(e) => {
                            const updatedAgents = [
                              ...architecture.components.elasticAgents,
                            ];
                            updatedAgents[index].dataRouting = e.target.value;

                            // If user selected an ETL tool, clear any previously selected ETL tools from the agent
                            if (e.target.value.startsWith("etl:")) {
                              updatedAgents[index].selectedEtlTools = [];
                            }

                            updateArchitecture({
                              ...architecture,
                              components: {
                                ...architecture.components,
                                elasticAgents: updatedAgents,
                              },
                            });
                          }}
                        />
                      </EuiFormRow>
                    </EuiAccordion>

                    <EuiAccordion
                      id={`${agent.id}-integrations`}
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
                            agent.selectedIntegrations || []
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
                                          ? `<img src="${
                                              integrationObj.icon
                                            }" alt="${
                                              integrationObj.label ||
                                              integration
                                            }" class="integration-icon" width="16" height="16" onerror="this.src='${DEFAULT_ICON_URL}';" />`
                                          : `<img src="${DEFAULT_ICON_URL}" alt="${
                                              integrationObj?.label ||
                                              integration
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

                            const updatedAgents = [
                              ...architecture.components.elasticAgents,
                            ];
                            updatedAgents[index].selectedIntegrations =
                              selectedIntegrations;

                            updateArchitecture({
                              ...architecture,
                              components: {
                                ...architecture.components,
                                elasticAgents: updatedAgents,
                              },
                            });
                          }}
                          renderOption={(
                            option,
                            searchValue,
                            contentClassName
                          ) => {
                            return option.renderOption
                              ? option.renderOption()
                              : option.label;
                          }}
                          isClearable={true}
                          fullWidth
                        />
                      </EuiFormRow>
                    </EuiAccordion>
                  </>
                )}
              </>
            )}
          </div>
        ))}

        <EuiSpacer size="m" />
        <EuiHorizontalRule />

        <EuiSpacer size="m" />
        <EuiTitle size="xs">
          <h3>Cluster Size</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiPanel hasShadow={false} paddingSize="s" hasBorder>
          {architecture.components.elasticsearch.enabled && (
            <>
              <EuiText size="s">
                <p style={{ margin: "0 0 8px 0", fontWeight: "600" }}>
                  Elasticsearch Resource Breakdown
                </p>
              </EuiText>

              <div
                style={{
                  display: "table",
                  width: "100%",
                  fontSize: "12px",
                  borderCollapse: "collapse",
                  marginBottom: "8px",
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: "table-row",
                    backgroundColor: "#F5F7FA",
                    fontWeight: "500",
                  }}
                >
                  <div
                    style={{
                      display: "table-cell",
                      padding: "8px",
                      borderBottom: "1px solid #D3DAE6",
                    }}
                  >
                    Component
                  </div>
                  <div
                    style={{
                      display: "table-cell",
                      padding: "8px",
                      borderBottom: "1px solid #D3DAE6",
                    }}
                  >
                    RAM
                  </div>
                  <div
                    style={{
                      display: "table-cell",
                      padding: "8px",
                      borderBottom: "1px solid #D3DAE6",
                    }}
                  >
                    Disk
                  </div>
                  <div
                    style={{
                      display: "table-cell",
                      padding: "8px",
                      borderBottom: "1px solid #D3DAE6",
                    }}
                  >
                    vCPU
                  </div>
                </div>

                {/* Elasticsearch Tiers */}
                {architecture.components.elasticsearch.tiers.hot.enabled && (
                  <div style={{ display: "table-row" }}>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      Hot Tier
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("hot").ram} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("hot").disk} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("hot").cpu}
                    </div>
                  </div>
                )}

                {architecture.components.elasticsearch.tiers.warm.enabled && (
                  <div style={{ display: "table-row" }}>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      Warm Tier
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("warm").ram} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("warm").disk} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("warm").cpu}
                    </div>
                  </div>
                )}

                {architecture.components.elasticsearch.tiers.cold.enabled && (
                  <div style={{ display: "table-row" }}>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      Cold Tier
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("cold").ram} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("cold").disk} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("cold").cpu}
                    </div>
                  </div>
                )}

                {architecture.components.elasticsearch.tiers.frozen.enabled && (
                  <div style={{ display: "table-row" }}>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      Frozen Tier
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("frozen").ram} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("frozen").disk} GB
                    </div>
                    <div
                      style={{
                        display: "table-cell",
                        padding: "8px",
                        borderBottom: "1px solid #EEF0F4",
                      }}
                    >
                      {calculateTierResources("frozen").cpu}
                    </div>
                  </div>
                )}

                {/* Machine Learning */}
                {architecture.components.mlNodes &&
                  architecture.components.mlNodes.enabled && (
                    <div style={{ display: "table-row" }}>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        Machine Learning
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {architecture.components.mlNodes.azCount *
                          architecture.components.mlNodes.nodeSize}{" "}
                        GB
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        -
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {calculateCPUCount(
                          architecture.components.mlNodes.azCount *
                            architecture.components.mlNodes.nodeSize *
                            1024,
                          architecture.components.mlNodes.cpuMultiplier || 0.1
                        ).toFixed(1)}
                      </div>
                    </div>
                  )}

                {/* Enterprise Search */}
                {architecture.components.enterpriseSearch &&
                  architecture.components.enterpriseSearch.enabled && (
                    <div style={{ display: "table-row" }}>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        Enterprise Search
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {architecture.components.enterpriseSearch.azCount *
                          architecture.components.enterpriseSearch
                            .nodeSize}{" "}
                        GB
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        -
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {calculateCPUCount(
                          architecture.components.enterpriseSearch.azCount *
                            architecture.components.enterpriseSearch.nodeSize *
                            1024,
                          architecture.components.enterpriseSearch
                            .cpuMultiplier || 0.1
                        ).toFixed(1)}
                      </div>
                    </div>
                  )}

                {/* Kibana */}
                {architecture.components.kibana &&
                  architecture.components.kibana.enabled && (
                    <div style={{ display: "table-row" }}>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        Kibana
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {architecture.components.kibana.azCount *
                          architecture.components.kibana.nodeSize}{" "}
                        GB
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        -
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {calculateCPUCount(
                          architecture.components.kibana.azCount *
                            architecture.components.kibana.nodeSize *
                            1024,
                          architecture.components.kibana.cpuMultiplier || 0.1
                        ).toFixed(1)}
                      </div>
                    </div>
                  )}

                {/* Integrations Server */}
                {architecture.components.integrationsServer &&
                  architecture.components.integrationsServer.enabled && (
                    <div style={{ display: "table-row" }}>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        Integrations Server
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {architecture.components.integrationsServer.azCount *
                          architecture.components.integrationsServer
                            .nodeSize}{" "}
                        GB
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        -
                      </div>
                      <div
                        style={{
                          display: "table-cell",
                          padding: "8px",
                          borderBottom: "1px solid #EEF0F4",
                        }}
                      >
                        {calculateCPUCount(
                          architecture.components.integrationsServer.azCount *
                            architecture.components.integrationsServer
                              .nodeSize *
                            1024,
                          architecture.components.integrationsServer
                            .cpuMultiplier || 0.1
                        ).toFixed(1)}
                      </div>
                    </div>
                  )}
              </div>

              <EuiHorizontalRule margin="xs" />

              <div style={{ margin: "8px 0 0 0" }}>
                <EuiText size="s">
                  <p style={{ margin: "0 0 8px 0", fontWeight: "600" }}>
                    Total Storage Capacity: {calculateTotalStorageCapacity()} GB
                  </p>
                  <p style={{ margin: "0", fontWeight: "600" }}>
                    Total Memory: {estimateClusterSize()} GB
                  </p>
                </EuiText>
              </div>
            </>
          )}

          {!architecture.components.elasticsearch.enabled && (
            <EuiText size="s">
              <p style={{ margin: "0", fontWeight: "600" }}>
                Total Memory: {estimateClusterSize()} GB
              </p>
            </EuiText>
          )}
        </EuiPanel>

        <EuiSpacer size="m" />
        <EuiButtonEmpty onClick={resetForm}>Reset to Default</EuiButtonEmpty>
      </EuiForm>
    </EuiPanel>
  );
};

// Export the InputForm component along with instance configurations
const InputFormWithConfigs = (props) => {
  const { architecture, updateArchitecture } = props;
  // Use our cached deployment templates to get instance configurations
  const { instanceConfigurations } = useCachedDeploymentTemplates();

  // Add instance configurations to the component props
  return (
    <InputForm {...props} instanceConfigurations={instanceConfigurations} />
  );
};

export default InputFormWithConfigs;
