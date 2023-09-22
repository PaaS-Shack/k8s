
/**
 * This is a definition of the molecularjs standard deployment image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    name: "molecularjs",
    namespace: "library",
    tag: "2.7.1",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "registry:2.7.1",
    registry: "docker.io",
    repository: "library/registry",
    description: "baisc molecularjs deployment",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [],
    env: [

    ],
    volumes: [],
    resources: {
        limits: {
            cpu: 250,
            memory: 250,
        },
        requests: {
            cpu: 50,
            memory: 40,
        }
    },
    labels: [],
    annotations: [],

}
