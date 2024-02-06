/**
 * This is a definition of the nats image.
 * 
 * library/nats:latest
 */
const FIELDS = require("../fields");

module.exports = {
    name: "nats",
    namespace: "library",
    tag: "latest",
    digest: "sha256:3d5f8a7e7d0e1d0a9b7b2d6a8d9a0a6a1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6c7",
    image: "nats:latest",
    registry: "docker.io",
    repository: "library/nats",
    description: "NATS is a simple, secure and high performance open source messaging system for cloud native applications, IoT messaging, and microservices architectures.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    args: [
        "-c",
        "/natsconfig/nats-server.conf"
    ],
    ports: [
        {
            name: "nats",
            port: 4222,
            protocol: "TCP"
        }, {
            name: "monitoring",
            port: 8222,
            protocol: "HTTP"
        }
    ],
    env: [],
    volumes: [
        {
            name: "nats-config",
            type: "configMap",
            mountPath: "/natsconfig/",
            configMap: {
                name: "nats-config",
                items: [
                    {
                        key: "nats-server.conf",
                        path: "nats-server.conf"
                    }
                ]
            }
        }
    ],
    configMap: {
        name: "nats-config",
        data: {
            "nats-server.conf": `
port: 4222
http: 8222

authorization {
  user: nats
  password: nats
}
`
        }
    }
};
