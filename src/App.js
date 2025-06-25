import React, { useState, useRef } from "react";
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiCallOut,
  EuiPanel,
  EuiProvider,
  EuiButtonIcon,
  EuiToolTip,
  EuiButton,
  EuiPopover,
  EuiText,
  EuiToast,
} from "@elastic/eui";
import InputForm from "./components/InputForm";
import ArchitectureDiagram from "./components/ArchitectureDiagram";

// Import Elastic icon for the header
// Import the Elastic logo image
import elasticLogo from "./img/icons/elastic-logo.png";

// Import EUI icon dependencies
import { appendIconComponentCache } from "@elastic/eui/es/components/icon/icon";

function App() {
  // Custom icons are now directly rendered using HTML
  const [isExportPopoverOpen, setIsExportPopoverOpen] = useState(false);
  const [showImportToast, setShowImportToast] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef(null);

  const [architecture, setArchitecture] = useState({
    environment: {
      hardwareProfile: "general-purpose", // Default hardware profile
      cloudProvider: "aws", // Default cloud provider
      region: "", // Region will be set dynamically based on available options
    },
    components: {
      kibana: {
        enabled: false,
        azCount: 1,
        nodeSize: 16,
      },
      elasticsearch: {
        enabled: true,
        tiers: {
          hot: {
            enabled: true,
            azCount: 1,
            nodeSize: 16,
          },
          warm: {
            enabled: false,
            azCount: 1,
            nodeSize: 16,
          },
          cold: {
            enabled: false,
            azCount: 1,
            nodeSize: 16,
          },
          frozen: {
            enabled: false,
            azCount: 1,
            nodeSize: 16,
          },
        },
      },
      mlNodes: {
        enabled: false,
        azCount: 1,
        nodeSize: 32,
      },
      enterpriseSearch: {
        enabled: false,
        azCount: 1,
        nodeSize: 16,
      },
      integrationsServer: {
        enabled: false,
        azCount: 1,
        nodeSize: 8,
      },
      logstash: {
        enabled: false,
        azCount: 1,
        nodeSize: 8,
      },
      elasticAgent: {
        enabled: false,
        selectedIntegrations: [],
      },
    },
  });

  const updateArchitecture = (newArchitecture) => {
    setArchitecture(newArchitecture);
  };

  // Export architecture to JSON file
  const exportToJson = () => {
    // Create an export object with metadata
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      architecture: architecture,
    };

    // Create a JSON blob from the current architecture state with metadata
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    // Create a download link for the JSON file
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(jsonBlob);
    downloadLink.download = `elastic-architecture-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    downloadLink.click();

    // Clean up
    URL.revokeObjectURL(downloadLink.href);
    setIsExportPopoverOpen(false);
  };

  // Import architecture from JSON file
  const importFromJson = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target.result);
        let importedArchitecture;

        // Handle both the new format with metadata and the old format
        if (parsedData.architecture && parsedData.version) {
          // New format with metadata
          importedArchitecture = parsedData.architecture;
        } else if (parsedData.components) {
          // Old format (direct architecture object)
          importedArchitecture = parsedData;
        } else {
          throw new Error("Unrecognized file format");
        }

        // Validate the imported architecture
        if (importedArchitecture && importedArchitecture.components) {
          setArchitecture(importedArchitecture);
          // Show success notification
          setImportFileName(file.name);
          setShowImportToast(true);
          // Auto-hide the toast after 5 seconds
          setTimeout(() => {
            setShowImportToast(false);
          }, 5000);
        } else {
          alert("Invalid architecture file format");
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Error parsing the file. Please ensure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
    // Reset the file input
    event.target.value = "";
  };

  // Handle import button click
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  // Toggle export popover
  const toggleExportPopover = () => {
    setIsExportPopoverOpen(!isExportPopoverOpen);
  };

  return (
    <EuiProvider colorMode="light">
      {showImportToast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1000,
          }}
        >
          <EuiToast
            title="Configuration Imported"
            color="success"
            iconType="check"
            onClose={() => setShowImportToast(false)}
          >
            <p>Successfully loaded configuration from {importFileName}</p>
          </EuiToast>
        </div>
      )}
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <div className="header-logo">
                    <img
                      src={elasticLogo}
                      alt="Elastic Logo"
                      width="40"
                      height="40"
                    />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="l">
                    <h1>Elastic Diagram Maker</h1>
                  </EuiTitle>
                </EuiFlexItem>
                {/* Hidden file input for import */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={importFromJson}
                  accept=".json"
                  style={{ display: "none" }}
                />
              </EuiFlexGroup>
            </EuiPageHeaderSection>
          </EuiPageHeader>

          <EuiPanel>
            <EuiCallOut
              title="Design your Elastic Stack architecture"
              color="primary"
            >
              <p>
                Use the form below to specify your Elastic Stack deployment. The
                architecture diagram will update automatically based on your
                inputs.
              </p>
            </EuiCallOut>

            <EuiSpacer size="l" />

            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                <InputForm
                  architecture={architecture}
                  updateArchitecture={updateArchitecture}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <ArchitectureDiagram
                  architecture={architecture}
                  exportToJson={exportToJson}
                  handleImportClick={handleImportClick}
                  isExportPopoverOpen={isExportPopoverOpen}
                  setIsExportPopoverOpen={setIsExportPopoverOpen}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPageBody>
      </EuiPage>
    </EuiProvider>
  );
}

export default App;
