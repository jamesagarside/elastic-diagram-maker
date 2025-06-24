import React, { useState } from "react";
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
} from "@elastic/eui";
import InputForm from "./components/InputForm";
import ArchitectureDiagram from "./components/ArchitectureDiagram";

// Import Elastic icon for the header
import { elasticLogo } from "./assets/elastic-icons";

// Import EUI icon dependencies
import { appendIconComponentCache } from "@elastic/eui/es/components/icon/icon";

function App() {
  // Custom icons are now directly rendered using HTML

  const [architecture, setArchitecture] = useState({
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

  return (
    <EuiProvider colorMode="light">
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <div
                    className="component-icon"
                    dangerouslySetInnerHTML={{ __html: elasticLogo }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="l">
                    <h1>Elastic Diagram Maker</h1>
                  </EuiTitle>
                </EuiFlexItem>
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
                <ArchitectureDiagram architecture={architecture} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPageBody>
      </EuiPage>
    </EuiProvider>
  );
}

export default App;
