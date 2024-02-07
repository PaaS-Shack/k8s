/**
 * this is the defanition of the filebrowser
 * 
 * docker.io/filebrowser/filebrowser:latest
 */
export const filebrowser = {
    name: "filebrowser-v2-27-0",
    namespace: "filebrowser",
    tag: "v2.27.0",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "docker.io/filebrowser/filebrowser:v2.27.0",
    registry: "docker.io",
    repository: "filebrowser/filebrowser",
    description: "Filebrowser is a file manager for the web running on your server",
    imagePullPolicy: "IfNotPresent",
    ports: [
        {
            name: "http",
            port: 80,
            protocol: "HTTP"
        }
    ],
    env: [],
    volumes: [
        {
            name: "filebrowser-data",
            type: "persistentVolumeClaim",
            mountPath: "/srv"
        }
    ],
    resources: {
        requests: {
            cpu: 10,
            memory: 32
        },
        limits: {
            cpu: 100,
            memory: 128
        }
    }
};