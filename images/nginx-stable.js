
/**
 * This is a definition of the docker.io/libary/nginx:stable image.
 * 
 * It conforms to the IMAGE_FIELDS in ../fields.js
 */

const FIELDS = require("../fields");

module.exports = {
    // name of the image
    name: "nginx-stable",
    // namespace of the image
    namespace: "library",
    // tag of the image
    tag: "stable",
    // digest of the image
    digest: 'sha256:001281a0eb6140b0e5096664d785abd6e6d2921316d002c1d912867725076299',
    // image name with tag
    image: "nginx:stable",
    // registry of the image
    registry: "docker.io",
    // repository of the image
    repository: "library/nginx",
    // description of the image
    description: "nginx is a widely used, open-source nginx management system (nginx).",
    // image pull policy
    imagePullPolicy: "IfNotPresent",
    // image pull secrets
    imagePullSecrets: [],
    // ports of the image
    ports: [
        {
            name: "nginx",
            port: 80,
            protocol: "HTTP"
        }
    ],
    // env of the image
    env: [],
    // volumes of the image
    volumes: [
        {
            name: "nginx-data",
            type: "persistentVolumeClaim",
            mountPath: "/var/www/html"
        },
        {
            name: 'nginx-config',
            type: 'configMap',
            mountPath: '/etc/nginx',
            configMap: {
                name: 'nginx-config',
                items: [
                    {
                        key: 'nginx.conf',
                        path: 'nginx.conf'
                    },
                    {
                        key: 'default.conf',
                        path: 'conf.d/default.conf'
                    }
                ]
            }
        }
    ],
    // resources of the image
    resources: {
        limits: {
            cpu: 500,// 500m
            memory: 500,// 500Mi
        },
        requests: {
            cpu: 100,// 100m
            memory: 20,// 20Mi
        }
    },
    // readiness probe of the image
    readinessProbe: {
        exec: {
            command: [
                "nginx",
                "-t"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    // liveness probe of the image
    livenessProbe: {
        exec: {
            command: [
                "nginx",
                "-t"
            ]
        },
        initialDelaySeconds: 10,
        periodSeconds: 10,
        timeoutSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3
    },
    // configMap of the image
    configMap: {
        name: 'nginx-config',
        data: {
            'nginx.conf': ``,
            'default.conf': ``
        }
    },
}
