// ETL and queuing tools data for the Data Collection dropdown
import { useState } from "react";

// Use static path references to the icons in the public folder
// Make sure we're using the correct absolute path with PUBLIC_URL
const PUBLIC_URL = process.env.PUBLIC_URL || "";

// Define common ETL and queuing tools
export const etlTools = [
  {
    id: "kafka",
    name: "Apache Kafka",
    description:
      "Distributed event streaming platform for high-performance data pipelines",
    icon: `${PUBLIC_URL}/img/etl-icons/kafka.svg`,
    category: "messaging",
  },
  {
    id: "aws-glue",
    name: "AWS Glue",
    description:
      "Serverless data integration service that makes it easy to discover, prepare, and combine data",
    icon: `${PUBLIC_URL}/img/etl-icons/aws-glue.svg`,
    category: "etl",
  },
  {
    id: "nifi",
    name: "Apache NiFi",
    description:
      "Data processing and distribution system for automating and managing data flows",
    icon: `${PUBLIC_URL}/img/etl-icons/nifi.svg`,
    category: "etl",
  },
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    description:
      "Message broker that implements Advanced Message Queuing Protocol (AMQP)",
    icon: `${PUBLIC_URL}/img/etl-icons/rabbitmq.svg`,
    category: "messaging",
  },
  {
    id: "spark",
    name: "Apache Spark",
    description: "Unified analytics engine for large-scale data processing",
    icon: `${PUBLIC_URL}/img/etl-icons/spark.svg`,
    category: "processing",
  },
  {
    id: "aws-kinesis",
    name: "AWS Kinesis",
    description: "Process and analyze real-time, streaming data",
    icon: `${PUBLIC_URL}/img/etl-icons/aws-kinesis.svg`,
    category: "streaming",
  },
  {
    id: "azure-data-factory",
    name: "Azure Data Factory",
    description:
      "Cloud-based data integration service for creating data-driven workflows",
    icon: `${PUBLIC_URL}/img/etl-icons/azure-data-factory.svg`,
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
