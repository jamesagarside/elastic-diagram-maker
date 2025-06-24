// Data integrations fetched from Elastic Package Registry API
// https://epr.elastic.co/search

import { useState, useEffect } from "react";

// API endpoint for Elastic Package Registry
const EPR_API_URL =
  "https://epr.elastic.co/search?experimental=true&prerelease=true";

// Empty array as fallback if API fails
const emptyIntegrations = [];

// Cache for integration data
let integrationsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch integrations from the Elastic Package Registry API
 * @returns {Promise<Array>} Array of integrations in the format { value: "name", label: "Name", icon: "url" }
 */
export const fetchIntegrations = async () => {
  // Return cached results if available and not expired
  const now = Date.now();
  if (integrationsCache && now - lastFetchTime < CACHE_DURATION) {
    return integrationsCache;
  }

  try {
    const response = await fetch(EPR_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch integrations: ${response.statusText}`);
    }

    const data = await response.json();

    // Base URL for the Elastic Package Registry
    const EPR_BASE_URL = "https://epr.elastic.co";

    // Map the API response to the expected format
    const integrations = data
      .map((pkg) => ({
        value: pkg.name,
        label: pkg.title || pkg.name,
        icon:
          pkg.icons && pkg.icons.length > 0
            ? `${EPR_BASE_URL}${pkg.icons[0].path}`
            : null,
        description: pkg.description,
        version: pkg.version,
        categories: pkg.categories || [],
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Update cache
    integrationsCache = integrations;
    lastFetchTime = now;

    return integrations;
  } catch (error) {
    console.error("Error fetching integrations:", error);
    // Return an empty array if API fails
    return emptyIntegrations;
  }
};

/**
 * React hook to fetch and use integrations
 * @returns {Object} { integrations, loading, error }
 */
export const useIntegrations = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getIntegrations = async () => {
      try {
        setLoading(true);
        const data = await fetchIntegrations();
        setIntegrations(data);
        setError(null);
      } catch (err) {
        console.error("Error in useIntegrations hook:", err);
        setIntegrations(emptyIntegrations);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getIntegrations();
  }, []);

  return { integrations, loading, error };
};

// Export an empty array for backward compatibility
export const dataIntegrations = emptyIntegrations;
