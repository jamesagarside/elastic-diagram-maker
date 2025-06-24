// Integration icons are now fetched dynamically from the Elastic Package Registry API

// Default icon to use when no specific icon is found
export const DEFAULT_ICON_URL =
  "https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt0090c6239e64faf8/62aa0980c949fd5059e8aebc/logo-stack-32-color.svg";

// Helper function to get the icon URL - now just returns the default icon
// This function is maintained for backward compatibility
export const getIconUrl = () => {
  // We no longer use static mappings, all icons come from the API
  return DEFAULT_ICON_URL;
};

// Function to generate HTML for the icon with error handling
export const getIconSvgForIntegration = (integrationKey) => {
  // Just return the default icon since we're using the API for icons
  return `<img src="${DEFAULT_ICON_URL}" alt="${integrationKey}" class="integration-icon" width="16" height="16" />`;
};
