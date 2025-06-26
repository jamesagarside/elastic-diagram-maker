// ETL and queuing tools data for the Data Collection dropdown
import { useState } from "react";

// Define common ETL and queuing tools
export const etlTools = [
  {
    id: "kafka",
    name: "Apache Kafka",
    description:
      "Distributed event streaming platform for high-performance data pipelines",
    icon: "https://svn.apache.org/repos/asf/comdev/project-logos/originals/kafka.svg",
    category: "messaging",
  },
  {
    id: "aws-glue",
    name: "AWS Glue",
    description:
      "Serverless data integration service that makes it easy to discover, prepare, and combine data",
    icon: "https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2017/07/10/glue-1.gif",
    category: "etl",
  },
  {
    id: "nifi",
    name: "Apache NiFi",
    description:
      "Data processing and distribution system for automating and managing data flows",
    icon: "https://nifi.apache.org/assets/images/apache-nifi-logo.svg",
    category: "etl",
  },
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    description:
      "Message broker that implements Advanced Message Queuing Protocol (AMQP)",
    icon: "https://www.rabbitmq.com/img/logo-rabbitmq.svg",
    category: "messaging",
  },
  {
    id: "spark",
    name: "Apache Spark",
    description: "Unified analytics engine for large-scale data processing",
    icon: "https://spark.apache.org/images/spark-logo-trademark.png",
    category: "processing",
  },
  {
    id: "aws-kinesis",
    name: "AWS Kinesis",
    description: "Process and analyze real-time, streaming data",
    icon: "https://d1.awsstatic.com/Products/product-name/diagrams/product-page-diagram-Amazon-Kinesis_Data-Streams.654def0dbe25622e9c98008c52df5fdb0bb44243.png",
    category: "streaming",
  },
  {
    id: "azure-data-factory",
    name: "Azure Data Factory",
    description:
      "Cloud-based data integration service for creating data-driven workflows",
    icon: "https://static-exp1.licdn.com/sc/h/8d0oxobnqs9od9b26v67nufij",
    category: "etl",
  },
  {
    id: "looker",
    name: "Looker",
    description:
      "Business intelligence software and big data analytics platform",
    icon: "https://upload.wikimedia.org/wikipedia/commons/3/35/Looker_logo.svg",
    category: "bi",
  },
  {
    id: "tableau",
    name: "Tableau",
    description:
      "Interactive data visualization software focused on business intelligence",
    icon: "https://logos-world.net/wp-content/uploads/2021/10/Tableau-Emblem.png",
    category: "bi",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Cloud-based data warehousing platform designed for the cloud",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Snowflake_Logo.svg/1280px-Snowflake_Logo.svg.png",
    category: "datawarehouse",
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
