import { useState, useEffect } from "react";

// Function to extract cloud provider from region_id
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

// Function to format region ID into a more readable format
const formatRegionId = (regionId) => {
  // Remove cloud provider prefix if exists
  let formattedId = regionId;

  // Replace prefixes
  if (regionId.startsWith("aws-")) {
    formattedId = regionId.replace("aws-", "");
  } else if (regionId.startsWith("azure-")) {
    formattedId = regionId.replace("azure-", "");
  } else if (regionId.startsWith("gcp-")) {
    formattedId = regionId.replace("gcp-", "");
  }

  // Return the region ID in lowercase with hyphens
  return formattedId;
};

// Custom hook to fetch and process deployment templates
export const useDeploymentTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Processed data for dropdowns
  const [hardwareProfiles, setHardwareProfiles] = useState([]);
  const [cloudProviders, setCloudProviders] = useState([]);
  const [regions, setRegions] = useState([]);

  // Selected values
  const [selectedHardwareProfile, setSelectedHardwareProfile] = useState("");
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  // Fetch templates from our proxy API endpoint
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use relative URL that works in both development and production
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
        setTemplates(validTemplates);

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

        // Try to set the default hardware profile to general-purpose if available
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
      } catch (err) {
        console.error("Error fetching deployment templates:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Update cloud providers when hardware profile changes
  useEffect(() => {
    if (selectedHardwareProfile && templates.length > 0) {
      const template = templates.find(
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

        // Try to set the default cloud provider to AWS if available
        const awsProvider = providers.find(
          (provider) => provider.value === "aws" || provider.text === "AWS"
        );

        if (awsProvider) {
          console.log(`Setting default cloud provider to AWS`);
          setSelectedCloudProvider(awsProvider.value);
          setSelectedRegion(""); // Reset region when changing cloud provider
        } else if (providers.length > 0) {
          // If AWS is not available, use the first provider in the list
          setSelectedCloudProvider(providers[0].value);
          setSelectedRegion("");
        } else {
          setSelectedCloudProvider("");
          setSelectedRegion("");
        }
      }
    }
  }, [selectedHardwareProfile, templates]);

  // Update regions when hardware profile or cloud provider changes
  useEffect(() => {
    if (
      selectedHardwareProfile &&
      selectedCloudProvider &&
      templates.length > 0
    ) {
      const template = templates.find(
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

        if (filteredRegions.length > 0) {
          // Reset selected region when changing hardware profile or cloud provider
          setSelectedRegion(filteredRegions[0].value);
        } else {
          setSelectedRegion("");
        }
      }
    }
  }, [selectedHardwareProfile, selectedCloudProvider, templates]);

  return {
    loading,
    error,
    templates, // Add the raw templates array
    hardwareProfiles,
    cloudProviders,
    regions,
    selectedHardwareProfile,
    selectedCloudProvider,
    selectedRegion,
    setSelectedHardwareProfile,
    setSelectedCloudProvider,
    setSelectedRegion,
  };
};
