// ETL and queuing tools data for the Data Collection dropdown
import { useState } from "react";

// Define static paths to ETL tool icons - using public URL
// This avoids SVG namespace issues with direct imports
const iconBasePath = process.env.PUBLIC_URL + "/img/etl-icons";

// Define common ETL and queuing tools
export const etlTools = [
  {
    id: "kafka",
    name: "Apache Kafka",
    description:
      "Distributed event streaming platform for high-performance data pipelines",
    icon: `${iconBasePath}/kafka.svg`,
    category: "messaging",
  },
  {
    id: "aws-glue",
    name: "AWS Glue",
    description:
      "Serverless data integration service that makes it easy to discover, prepare, and combine data",
    icon: `${iconBasePath}/aws-glue.svg`,
    category: "etl",
  },
  {
    id: "nifi",
    name: "Apache NiFi",
    description:
      "Data processing and distribution system for automating and managing data flows",
    icon: `${iconBasePath}/nifi.svg`,
    category: "etl",
  },
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    description:
      "Message broker that implements Advanced Message Queuing Protocol (AMQP)",
    icon: `${iconBasePath}/rabbitmq.svg`,
    category: "messaging",
  },
  {
    id: "spark",
    name: "Apache Spark",
    description: "Unified analytics engine for large-scale data processing",
    icon: `${iconBasePath}/spark.svg`,
    category: "processing",
  },
  {
    id: "aws-kinesis",
    name: "AWS Kinesis",
    description: "Process and analyze real-time, streaming data",
    icon: `${iconBasePath}/aws-kinesis.svg`,
    category: "streaming",
  },
  {
    id: "azure-data-factory",
    name: "Azure Data Factory",
    description:
      "Cloud-based data integration service for creating data-driven workflows",
    icon: `${iconBasePath}/azure-data-factory.svg`,
    category: "etl",
  },
];

/**
 * React hook to use ETL tools
 * @returns {Object} { tools, selectedTools, addTool, removeTool }
 */
export const useEtlTools = () => {
  const [selectedTools, setSelectedTools] = useState([]);

  const addTool = (toolId) => {
    // Check if tool already exists
    if (!selectedTools.includes(toolId)) {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  const removeTool = (toolId) => {
    setSelectedTools(selectedTools.filter((id) => id !== toolId));
  };

  return { tools: etlTools, selectedTools, addTool, removeTool };
};
