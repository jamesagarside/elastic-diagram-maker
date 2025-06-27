import { useState, useEffect } from "react";

// Cache to store instance configurations for each region
const instanceConfigCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch deployment templates for a specific region
 * @param {string} regionId - The region ID to fetch templates for (e.g., aws-us-east-1)
 * @returns {Promise<Object>} The deployment templates for the region
 */
export const fetchDeploymentTemplatesByRegion = async (regionId) => {
  if (!regionId) {
    throw new Error("Region ID is required");
  }

  const cacheKey = regionId;
  const cachedData = instanceConfigCache.get(cacheKey);
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    // Use relative URL that works in both development and production
    const response = await fetch(
      `/api/deployment-templates-by-region?region=${encodeURIComponent(
        regionId
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    instanceConfigCache.set(cacheKey, {
      data,
      timestamp: now,
    });

    return data;
  } catch (error) {
    console.error(
      `Error fetching deployment templates for region ${regionId}:`,
      error
    );
    throw error;
  }
};

/**
 * Hook to fetch and manage deployment templates for a region
 * @param {string} regionId - The region ID to fetch templates for (e.g., aws-us-east-1)
 * @param {string} hardwareProfileId - The hardware profile ID to filter by
 * @returns {Object} The deployment templates data and loading state
 */
export const useRegionDeploymentTemplates = (regionId, hardwareProfileId) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [instanceConfigurations, setInstanceConfigurations] = useState({});
  const [nodeSizes, setNodeSizes] = useState({});

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!regionId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchDeploymentTemplatesByRegion(regionId);

        // Filter by hardware profile if provided
        const filteredTemplates = hardwareProfileId
          ? data.filter(
              (template) => template.template_category_id === hardwareProfileId
            )
          : data;

        setTemplates(filteredTemplates);

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

          setInstanceConfigurations(configsMap);

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

              // Log the mapping for debugging
              console.log(
                `Mapping nodeId ${nodeId} to componentType ${componentType}, configId: ${configId}`
              );

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

          // Process Logstash (may need to be added if available in the templates)

          setNodeSizes(sizesByComponent);
        }
      } catch (err) {
        console.error("Error fetching deployment templates by region:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [regionId, hardwareProfileId]);

  return {
    templates,
    instanceConfigurations,
    nodeSizes,
    loading,
    error,
  };
};

/**
 * Format the size in GB or TB for display
 * @param {number} sizeInMB - The size in MB
 * @returns {string} Formatted size string (e.g., "2GB" or "4TB")
 */
export const formatSize = (sizeInMB) => {
  if (!sizeInMB) return "0GB";

  // Convert MB to GB
  const sizeInGB = sizeInMB / 1024;

  if (sizeInGB >= 1024) {
    const sizeInTB = sizeInGB / 1024;
    return `${sizeInTB}TB`;
  }

  return `${sizeInGB}GB`;
};

/**
 * Calculate CPU count based on memory and CPU multiplier
 * @param {number} memorySizeInMB - The memory size in MB
 * @param {number} cpuMultiplier - The CPU multiplier ratio
 * @returns {number} The calculated CPU count
 */
export const calculateCPUCount = (memorySizeInMB, cpuMultiplier) => {
  if (!memorySizeInMB || !cpuMultiplier) return 0;

  // Formula: memoryGB * cpuMultiplier = CPU count
  const memorySizeInGB = memorySizeInMB / 1024;
  return Math.round(memorySizeInGB * cpuMultiplier * 10) / 10; // Round to 1 decimal place
};

/**
 * Calculate storage size based on memory and storage multiplier
 * @param {number} memorySizeInMB - The memory size in MB
 * @param {number} storageMultiplier - The storage multiplier ratio
 * @returns {number} The calculated storage size in GB
 */
export const calculateStorageSizeGB = (memorySizeInMB, storageMultiplier) => {
  if (!memorySizeInMB || !storageMultiplier) return 0;

  // Formula: memoryGB * storageMultiplier = StorageGB
  const memorySizeInGB = memorySizeInMB / 1024;
  return Math.round(memorySizeInGB * storageMultiplier);
};

/**
 * Create a formatted ratio string (e.g., "1:8")
 * @param {number} multiplier - The multiplier value
 * @returns {string} Formatted ratio string
 */
export const formatRatio = (multiplier) => {
  if (!multiplier) return "1:1";
  return `1:${multiplier}`;
};
