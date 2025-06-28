import React, { useState, useEffect } from "react";
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiToolTip,
} from "@elastic/eui";

/**
 * Footer component that displays the GitHub version information
 * @returns {JSX.Element} The version footer component
 */
const VersionFooter = () => {
  const [versionInfo, setVersionInfo] = useState({
    version: process.env.REACT_APP_VERSION || "dev",
    commit: process.env.REACT_APP_COMMIT_SHA || "",
    buildDate:
      process.env.REACT_APP_BUILD_DATE ||
      new Date().toISOString().split("T")[0],
  });

  // Attempt to fetch version info from server on component mount
  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const response = await fetch("/api/version");
        if (response.ok) {
          const data = await response.json();
          setVersionInfo(data);
        }
      } catch (error) {
        console.warn("Failed to fetch version information:", error);
        // Fallback to environment variables is already handled in initial state
      }
    };

    fetchVersionInfo();
  }, []);

  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      alignItems="center"
      style={{
        padding: "8px 16px",
        borderTop: "1px solid #D3DAE6",
        marginTop: "20px",
      }}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <p>© {new Date().getFullYear()} Elastic Diagram Maker</p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={`Commit: ${versionInfo.commit.slice(0, 7)}, Build date: ${
            versionInfo.buildDate
          }`}
        >
          <EuiText size="xs" color="subdued">
            <EuiLink
              href="https://github.com/jamesagarside/elastic-diagram-maker"
              target="_blank"
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <EuiIcon type="logoGithub" size="s" />
              Version {versionInfo.version}
            </EuiLink>
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export default VersionFooter;
