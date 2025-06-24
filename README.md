# Elastic Diagram Maker

A web application for creating visual representations of Elastic Stack diagrams.

## Features

- Design your Elastic Stack diagram with customizable components
- Specify the number of availability zones and node sizes
- Include Elasticsearch (Hot, Warm, Cold, and Frozen tiers), Kibana, Machine Learning nodes, Enterprise Search, Integrations Server, Logstash, and Elastic Agent
- Download your diagram as a PNG image
- Estimate the total memory requirements for your deployment

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm (v6 or newer)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/jamesagarside/elastic-diagram-maker.git
cd elastic-diagram-maker
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Use the form on the left side of the application to configure your Elastic Stack deployment:

   - Set the number of availability zones (1-5)
   - Specify the node size in GB
   - Toggle the components you want to include in your diagram

2. The diagram diagram will update in real-time as you make changes

3. Click the "Download as PNG" button to save your diagram diagram

## Building for Production

```bash
npm run build
```

This creates a production-ready build in the `build` folder.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Elastic](https://www.elastic.co/) for the Elastic UI framework
- [React](https://reactjs.org/) for the front-end library
