import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchDeploymentTemplatesByRegion,
  formatSize,
} from "./instance-configurations";

// Helper function to extract cloud provider from region_id
const getCloudProvider = (regionId) => {
  if (!regionId) return "unknown";

  // Handle AWS regions with explicit prefix
  if (regionId.startsWith("aws-")) {
    return "aws";
  }
  // Handle AWS regions without prefix (ap-northeast-1, ap-southeast-1, etc.)
  else if (
    regionId.startsWith("ap-") ||
    regionId.startsWith("eu-") ||
    regionId.startsWith("sa-") ||
    regionId.startsWith("us-")
  ) {
    return "aws";
  } else if (regionId.startsWith("azure-")) {
    return "azure";
  } else if (regionId.startsWith("gcp-")) {
    return "gcp";
  }

  return "unknown";
};

// Generate a cache key for storing templates
const generateCacheKey = (regionId, hardwareProfileId, cloudProvider) => {
  return `${regionId}-${hardwareProfileId}-${cloudProvider}`;
};

/**
 * Custom hook that combines useDeploymentTemplates and useRegionDeploymentTemplates
 * to efficiently manage and cache deployment templates
 */
export const useCachedDeploymentTemplates = () => {
  // Main template state
  const [allTemplates, setAllTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dropdown selections state
  const [hardwareProfiles, setHardwareProfiles] = useState([]);
  const [cloudProviders, setCloudProviders] = useState([]);
  const [regions, setRegions] = useState([]);

  // Selected values
  const [selectedHardwareProfile, setSelectedHardwareProfile] = useState("");
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  // Cache for region-specific templates and node sizes
  const [templateCache, setTemplateCache] = useState({});
  const [instanceConfigurations, setInstanceConfigurations] = useState({});
  const [nodeSizes, setNodeSizes] = useState({});

  // Flag to track if initial load is complete
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Fetch all templates on component mount
  useEffect(() => {
    const fetchAllTemplates = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/deployment-templates", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Fetched ${data.length} deployment templates`);

        // Validate the data format
        if (!Array.isArray(data)) {
          throw new Error(
            "Invalid data format: expected an array of templates"
          );
        }

        // Filter out any invalid templates
        const validTemplates = data.filter(
          (template) =>
            template &&
            typeof template === "object" &&
            template.template_category_id &&
            template.name &&
            Array.isArray(template.regions)
        );

        console.log(`Found ${validTemplates.length} valid templates`);
        setAllTemplates(validTemplates);

        // Process templates to extract unique hardware profiles
        const profiles = [
          ...new Set(
            validTemplates.map((template) => template.template_category_id)
          ),
        ]
          .map((id) => {
            const template = validTemplates.find(
              (t) => t.template_category_id === id
            );
            return {
              value: id,
              text: template ? template.name : id,
              description: template ? template.description : "",
            };
          })
          .sort((a, b) => a.text.localeCompare(b.text));

        console.log(`Generated ${profiles.length} hardware profiles`);
        setHardwareProfiles(profiles);

        // Try to restore from sessionStorage first
        const storedProfile = sessionStorage.getItem("selectedHardwareProfile");
        if (storedProfile && profiles.some((p) => p.value === storedProfile)) {
          setSelectedHardwareProfile(storedProfile);
        } else {
          // Otherwise try to set the default hardware profile to general-purpose if available
          const generalPurposeProfile = profiles.find(
            (profile) =>
              profile.value === "general-purpose" ||
              profile.value === "default" ||
              profile.text.toLowerCase().includes("general purpose")
          );

          if (generalPurposeProfile) {
            console.log(
              `Setting default hardware profile to ${generalPurposeProfile.text}`
            );
            setSelectedHardwareProfile(generalPurposeProfile.value);
          } else if (profiles.length > 0) {
            setSelectedHardwareProfile(profiles[0].value);
          }
        }

        setInitialLoadComplete(true);
      } catch (err) {
        console.error("Error fetching deployment templates:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTemplates();
  }, []);

  // Update cloud providers when hardware profile changes
  useEffect(() => {
    if (selectedHardwareProfile && allTemplates.length > 0) {
      const template = allTemplates.find(
        (t) => t.template_category_id === selectedHardwareProfile
      );

      if (template && template.regions) {
        // Extract unique cloud providers from the selected hardware profile's regions
        const providers = [
          ...new Set(
            template.regions
              .filter((region) => region && region.region_id) // Filter out invalid regions
              .map((region) => {
                const provider = getCloudProvider(region.region_id);
                return provider;
              })
              .filter((provider) => provider !== "unknown") // Filter out unknown providers
          ),
        ]
          .map((provider) => ({
            value: provider,
            text: provider.toUpperCase(),
          }))
          .sort((a, b) => a.text.localeCompare(b.text));

        console.log(
          `Generated ${providers.length} cloud providers for hardware profile: ${selectedHardwareProfile}`
        );
        setCloudProviders(providers);

        // Try to restore from sessionStorage first
        const storedProvider = sessionStorage.getItem("selectedCloudProvider");
        if (
          storedProvider &&
          providers.some((p) => p.value === storedProvider)
        ) {
          setSelectedCloudProvider(storedProvider);
        } else {
          // Try to set the default cloud provider to AWS if available
          const awsProvider = providers.find(
            (provider) => provider.value === "aws" || provider.text === "AWS"
          );

          if (awsProvider) {
            console.log(`Setting default cloud provider to AWS`);
            setSelectedCloudProvider(awsProvider.value);
          } else if (providers.length > 0) {
            // If AWS is not available, use the first provider in the list
            setSelectedCloudProvider(providers[0].value);
          } else {
            setSelectedCloudProvider("");
          }
        }
      }
    }
  }, [selectedHardwareProfile, allTemplates, initialLoadComplete]);

  // Update regions when hardware profile or cloud provider changes
  useEffect(() => {
    console.log(
      `Region update effect running: hardware=${selectedHardwareProfile}, provider=${selectedCloudProvider}, templatesCount=${allTemplates.length}`
    );

    if (
      selectedHardwareProfile &&
      selectedCloudProvider &&
      allTemplates.length > 0
    ) {
      console.log(
        `Updating regions for ${selectedCloudProvider} cloud provider`
      );
      const template = allTemplates.find(
        (t) => t.template_category_id === selectedHardwareProfile
      );

      if (template && template.regions) {
        // Filter regions by selected cloud provider
        let regionsWithText = template.regions
          .filter((region) => region && region.region_id) // Filter out invalid regions
          .filter((region) => {
            const provider = getCloudProvider(region.region_id);
            return provider === selectedCloudProvider;
          })
          .map((region) => {
            // Extract just the region part without the cloud provider prefix
            let displayText = region.region_id;

            // Handle AWS regions with prefix
            if (region.region_id.startsWith("aws-")) {
              displayText = region.region_id.replace("aws-", "");
            }
            // AWS regions without prefix don't need replacement
            else if (
              region.region_id.startsWith("ap-") ||
              region.region_id.startsWith("eu-") ||
              region.region_id.startsWith("sa-") ||
              region.region_id.startsWith("us-")
            ) {
              displayText = region.region_id;
            }
            // Handle other cloud providers
            else if (region.region_id.startsWith("azure-")) {
              displayText = region.region_id.replace("azure-", "");
            } else if (region.region_id.startsWith("gcp-")) {
              displayText = region.region_id.replace("gcp-", "");
            }

            return {
              value: region.region_id,
              text: displayText,
              displayText: displayText.toLowerCase(), // Normalize for deduplication
              deployment_template_id: region.deployment_template_id,
              versions: region.versions,
            };
          });

        // Remove duplicates - keep only one instance of each region display name
        const seen = new Set();
        const filteredRegions = regionsWithText
          .filter((region) => {
            const isDuplicate = seen.has(region.displayText);
            seen.add(region.displayText);
            return !isDuplicate;
          })
          .map(({ displayText, ...rest }) => rest) // Remove the temporary field
          .sort((a, b) => a.text.localeCompare(b.text));

        console.log(
          `Generated ${filteredRegions.length} unique regions for cloud provider: ${selectedCloudProvider}`
        );
        setRegions(filteredRegions);

        // Try to restore from sessionStorage first
        const storedRegion = sessionStorage.getItem("selectedRegion");
        if (
          storedRegion &&
          filteredRegions.some((r) => r.value === storedRegion)
        ) {
          setSelectedRegion(storedRegion);
        } else if (filteredRegions.length > 0) {
          // Otherwise set to the first available region
          setSelectedRegion(filteredRegions[0].value);
        } else {
          setSelectedRegion("");
        }
      }
    }
  }, [
    selectedHardwareProfile,
    selectedCloudProvider,
    allTemplates,
    initialLoadComplete,
  ]);

  // For debouncing template fetches
  const fetchTimeoutRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // Fetch region-specific templates and cache them
  useEffect(() => {
    // Skip if we don't have all required fields
    if (!selectedRegion || !selectedHardwareProfile) {
      return;
    }

    // Clean up any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    const cacheKey = generateCacheKey(
      selectedRegion,
      selectedHardwareProfile,
      selectedCloudProvider
    );

    // Check if we already have this template cached
    if (templateCache[cacheKey]) {
      console.log(`Using cached templates for ${cacheKey}`);
      // Use the cached data
      setInstanceConfigurations(templateCache[cacheKey].instanceConfigurations);
      setNodeSizes(templateCache[cacheKey].nodeSizes);
      return;
    }

    // Throttle fetches to prevent overloading the API
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) {
      // 1 second minimum between fetches
      console.log(`Throttling template fetch for ${cacheKey}`);

      fetchTimeoutRef.current = setTimeout(() => {
        console.log(`Executing throttled fetch for ${cacheKey}`);
        lastFetchTimeRef.current = Date.now();
        fetchRegionTemplates();
      }, 1000);

      return;
    }

    // Standard fetch path
    lastFetchTimeRef.current = now;
    fetchRegionTemplates();

    async function fetchRegionTemplates() {
      setLoading(true);
      setError(null);

      try {
        console.log(
          `Fetching templates for region ${selectedRegion}, hardware profile ${selectedHardwareProfile} and cloud provider ${selectedCloudProvider}`
        );

        const data = await fetchDeploymentTemplatesByRegion(selectedRegion);

        console.log(
          `Fetched ${data.length} templates for region ${selectedRegion}`
        );

        // Log what cloud provider we detected for this region
        const detectedProvider = getCloudProvider(selectedRegion);
        console.log(
          `Detected cloud provider for region ${selectedRegion}: ${detectedProvider}`
        );

        // Verify it matches our selected provider
        if (detectedProvider !== selectedCloudProvider) {
          console.warn(
            `Warning: Detected cloud provider ${detectedProvider} doesn't match selected provider ${selectedCloudProvider}`
          );
        }

        // Filter by hardware profile if provided
        const filteredTemplates = selectedHardwareProfile
          ? data.filter(
              (template) =>
                template.template_category_id === selectedHardwareProfile
            )
          : data;

        // Process instance configurations from templates
        if (filteredTemplates.length > 0) {
          const template = filteredTemplates[0]; // Use the first matching template

          // Get all instance configurations
          const configs = template.instance_configurations || [];

          // Convert to an object keyed by instance ID
          const configsMap = configs.reduce((acc, config) => {
            acc[config.id] = config;
            return acc;
          }, {});

          // Extract available node sizes per component type
          const sizesByComponent = {};

          // Process Elasticsearch tiers
          if (
            template.deployment_template?.resources?.elasticsearch?.[0]?.plan
              ?.cluster_topology
          ) {
            const topology =
              template.deployment_template.resources.elasticsearch[0].plan
                .cluster_topology;

            topology.forEach((node) => {
              const nodeId = node.id;
              const configId = node.instance_configuration_id;

              // Skip if the nodeId is not relevant or configId doesn't exist
              if (!configId || !configsMap[configId]) return;

              // Map node types to our component types
              let componentType = "";

              if (nodeId === "hot_content" || nodeId === "hot") {
                componentType = "elasticsearch.hot";
              } else if (nodeId === "warm") {
                componentType = "elasticsearch.warm";
              } else if (nodeId === "cold") {
                componentType = "elasticsearch.cold";
              } else if (nodeId === "frozen") {
                componentType = "elasticsearch.frozen";
              } else if (nodeId === "ml") {
                componentType = "mlNodes";
              } else if (nodeId === "master") {
                componentType = "elasticsearch.master";
              } else if (nodeId === "coordinating") {
                componentType = "elasticsearch.coordinating";
              }

              if (
                componentType &&
                configsMap[configId]?.discrete_sizes?.sizes
              ) {
                sizesByComponent[componentType] = {
                  sizes: configsMap[configId].discrete_sizes.sizes,
                  defaultSize: configsMap[configId].discrete_sizes.default_size,
                  storageMultiplier:
                    configsMap[configId].storage_multiplier || 1.0,
                  cpuMultiplier: configsMap[configId].cpu_multiplier || 0.1,
                  configId,
                };
              }
            });
          }

          // Process Kibana
          if (
            template.deployment_template?.resources?.kibana?.[0]?.plan
              ?.cluster_topology
          ) {
            const kibanaConfig =
              template.deployment_template.resources.kibana[0].plan
                .cluster_topology[0];
            const configId = kibanaConfig?.instance_configuration_id;

            if (configId && configsMap[configId]?.discrete_sizes?.sizes) {
              sizesByComponent["kibana"] = {
                sizes: configsMap[configId].discrete_sizes.sizes,
                defaultSize: configsMap[configId].discrete_sizes.default_size,
                storageMultiplier:
                  configsMap[configId].storage_multiplier || 1.0,
                cpuMultiplier: configsMap[configId].cpu_multiplier || 0.1,
                configId,
              };
            }
          }

          // Process Enterprise Search
          if (
            template.deployment_template?.resources?.enterprise_search?.[0]
              ?.plan?.cluster_topology
          ) {
            const enterpriseConfig =
              template.deployment_template.resources.enterprise_search[0].plan
                .cluster_topology[0];
            const configId = enterpriseConfig?.instance_configuration_id;

            if (configId && configsMap[configId]?.discrete_sizes?.sizes) {
              sizesByComponent["enterpriseSearch"] = {
                sizes: configsMap[configId].discrete_sizes.sizes,
                defaultSize: configsMap[configId].discrete_sizes.default_size,
                storageMultiplier:
                  configsMap[configId].storage_multiplier || 1.0,
                cpuMultiplier: configsMap[configId].cpu_multiplier || 0.1,
                configId,
              };
            }
          }

          // Process Integrations Server
          if (
            template.deployment_template?.resources?.integrations_server?.[0]
              ?.plan?.cluster_topology
          ) {
            const integrationsConfig =
              template.deployment_template.resources.integrations_server[0].plan
                .cluster_topology[0];
            const configId = integrationsConfig?.instance_configuration_id;

            if (configId && configsMap[configId]?.discrete_sizes?.sizes) {
              sizesByComponent["integrationsServer"] = {
                sizes: configsMap[configId].discrete_sizes.sizes,
                defaultSize: configsMap[configId].discrete_sizes.default_size,
                storageMultiplier:
                  configsMap[configId].storage_multiplier || 1.0,
                cpuMultiplier: configsMap[configId].cpu_multiplier || 0.1,
                configId,
              };
            }
          }

          // Process any other components your app needs here

          // Store the results
          setInstanceConfigurations(configsMap);
          setNodeSizes(sizesByComponent);

          // Cache the results
          setTemplateCache((prevCache) => ({
            ...prevCache,
            [cacheKey]: {
              templates: filteredTemplates,
              instanceConfigurations: configsMap,
              nodeSizes: sizesByComponent,
            },
          }));
        }
      } catch (err) {
        console.error("Error fetching deployment templates by region:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRegionTemplates();
  }, [
    selectedRegion,
    selectedHardwareProfile,
    selectedCloudProvider,
    templateCache,
  ]);

  // Wrapper function to update hardware profile and save to session storage
  const updateHardwareProfile = useCallback((profile) => {
    setSelectedHardwareProfile(profile);
    sessionStorage.setItem("selectedHardwareProfile", profile);
  }, []);

  // Wrapper function to update cloud provider and save to session storage
  const updateCloudProvider = useCallback((provider) => {
    console.log(
      `Updating cloud provider to ${provider} and clearing cached templates`
    );
    setSelectedCloudProvider(provider);

    // Clear the cached templates for this provider to force a refresh
    setTemplateCache((prevCache) => {
      // Create a new cache object without entries for this cloud provider
      const newCache = {};
      Object.keys(prevCache).forEach((key) => {
        if (!key.endsWith(`-${provider}`)) {
          newCache[key] = prevCache[key];
        }
      });
      return newCache;
    });

    // Reset nodeSizes and instanceConfigurations to force a refresh
    setNodeSizes({});
    setInstanceConfigurations({});

    sessionStorage.setItem("selectedCloudProvider", provider);
  }, []);

  // Wrapper function to update region and save to session storage
  const updateRegion = useCallback((region) => {
    setSelectedRegion(region);
    sessionStorage.setItem("selectedRegion", region);
  }, []);

  return {
    templates: allTemplates,
    loading,
    error,
    hardwareProfiles,
    cloudProviders,
    regions,
    nodeSizes,
    instanceConfigurations,
    selectedHardwareProfile,
    selectedCloudProvider,
    selectedRegion,
    updateHardwareProfile,
    updateCloudProvider,
    updateRegion,
  };
};

export default useCachedDeploymentTemplates;
