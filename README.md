# K8S 

K8S are a set of services that provide a Kubernetes API like interface for managing Kubernetes resources. The services are implemented as a set of modules that can be used together or independently. The modules are designed to be used with the [Kubernetes API](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/) and [Kubernetes API Reference](https://kubernetes.io/docs/reference/).

## Namespace

Namespaces are a way to divide cluster resources between multiple users (via resource quota). Namespaces are intended for use in environments with many users spread across multiple teams, or projects. For clusters with a few to tens of users, you should not need to create or think about namespaces at all. Start using namespaces when you need the features they provide.


### 1. Module Exports:
   - **Name and Version:** The module is named "k8s.namespaces" with version 1.
   - **Mixins:** Includes mixins for a database service and membership.

### 2. Settings:
   - **REST Configuration:** Specifies REST endpoint for namespace operations.
   - **Fields:** Defines fields for the namespace service, including those from the database service and membership mixins.
   - **Scopes:** Specifies default scopes for the database and membership.
   - **Default Scopes:** Specifies default database and membership scopes.

### 3. Actions:
   - **clean:** Removes all entities (namespaces) with a scope.
   - **resolveName:** Resolves a namespace by its name.
   - **available:** Checks if a namespace is available.
   - **status:** Retrieves the status of a namespace.
   - **resourcequota:** Retrieves resource quota information for a namespace.

### 4. Events:
   - Listens for events related to namespace creation, removal, and Kubernetes-related events.

### 5. Methods:
   - **transformResource:** Transforms the resource status.

### 6. Lifecycle Hooks:
   - **created, started, stopped:** Lifecycle hooks for additional initialization or cleanup.

### 7. Validators (at the end of the file):
   - **validateDomain:** Validates if a specified domain exists.
   - **validateName:** Validates if a namespace name is already in use.

### 8. Methods:
   - **getIdFromAnnotation:** Retrieves the unique identifier from annotations.
   - **createNamespace:** Creates a new namespace.
   - **deleteNamespace:** Deletes a namespace.
   - **generateAnnotations:** Generates annotations for a namespace.
   - **generateLabels:** Generates labels for a namespace.
   - **findByName:** Finds a namespace by name.
   - **findById:** Finds a namespace by ID.
   - **updateUid:** Updates the UID for a namespace.
   
### 9. Validation Functions:
   - **validateDomain:** Validates if a specified domain exists.
   - **validateName:** Validates if a namespace name is already in use.

This module provides a set of actions and methods for managing Kubernetes namespaces, including creating, deleting, and retrieving information about namespaces. It also listens for relevant events and includes validation functions.

## Deployment

Service named "k8s.deployments" with version 1. It is a service for managing Kubernetes deployments. 



Here's a breakdown of the key components:

### 1. Module Exports:
   - **Name and Version:** The module is named "k8s.deployments" with version 1.
   - **Mixins:** Includes mixins for database service, membership, configuration loading, and a custom `DeploymentSchemaMixin`.

### 2. Settings:
   - **REST Configuration:** Defines REST endpoints and fields for the deployment service.
   - **Dependencies:** Currently, there are no external dependencies specified.
   - **Configurations:** Specifies various configuration parameters such as Prometheus integration, Prometheus URL, and affinity settings.

### 3. Actions:
   - **generate:** Generates Kubernetes deployment schema based on provided parameters.
   - **apply:** Applies the Kubernetes deployment schema.
   - **status:** Gets the status of a deployment.
   - **logs:** Retrieves logs for a deployment.
   - **events:** Retrieves events related to a deployment.
   - **pods:** Retrieves pods related to a deployment.
   - **state:** Gets the overall state of a deployment including pod states and deployment status.
   - **scale:** Scales the deployment by adjusting the number of replicas.
   - **restart:** Restarts a deployment, updating its metadata to trigger a restart.
   - **top:** Gets resource usage metrics for pods associated with a deployment.
   - **createDeployment:** Creates a new deployment.

### 4. Events:
   - Listens for events related to deployment creation, update, and removal.

### 5. Methods:
   - **getPodStates:** Gets the states of pods associated with a deployment.
   - **applyDeployment:** Applies a deployment by replacing it with a new schema.
   - **createDeployment:** Creates a new deployment.
   - **removeDeployment:** Removes a deployment.

### 6. Lifecycle Hooks:
   - **created, started, stopped:** Lifecycle hooks that can be utilized for additional initialization or cleanup.

## Environment Variables

Service named "k8s.envs" with version 1. It is a service for managing environment variables related to Kubernetes deployments. Here's a breakdown of the key components:

### 1. Module Exports:
   - **Name and Version:** The module is named "k8s.envs" with version 1.
   - **Mixins:** Includes mixins for a database service and configuration loading.

### 2. Settings:
   - **REST Configuration:** Specifies REST endpoint for environment-related operations.
   - **Fields:** Defines fields for the environment service, including those from the database service.
   - **Scopes:** Specifies default scopes for the database.
   - **Default Scopes:** Specifies default database scopes.
   - **Config:** Empty configuration object.

### 3. Actions:
   - **resolveENV:** Resolves an environment variable based on specified parameters.
   - **create:** Creates an environment variable.
   - **clean:** Removes all entities with a scope.
   - **rePatchConfigMap:** Repatches the ConfigMap for a deployment and namespace.
   - **patchConfigMap:** Patches the ConfigMap for a deployment and namespace.
   - **remove:** Removes an environment variable.
   - **pack:** Packs environment variables for a deployment and namespace.
   - **createEnv:** Creates environment variables for a deployment, namespace, and image.

### 4. Events:
   - Listens for events related to environment variable creation, removal, updates, deployment creation/removal, and namespace removal.

### 5. Methods:
   - **initDeploymentEnvs:** Initializes environment variables for a deployment and namespace.
   - **patchConfigMap:** Patches the ConfigMap for a deployment and namespace.

### 6. Lifecycle Hooks:
   - **created, started, stopped:** Lifecycle hooks for additional initialization or cleanup.

### 7. Methods (in the `methods` object):
   - **initDeploymentEnvs:** Initializes environment variables for a deployment and namespace.
   - **patchConfigMap:** Patches the ConfigMap for a deployment and namespace.

### 8. Events (in the `events` object):
   - Listens for various events and performs actions like patching ConfigMap, deprovisioning, and creating environment variables.


This service to facilitate the management of environment variables for Kubernetes deployments and integrates with the Kubernetes ConfigMap to synchronize the environment variables with the cluster. It also listens for deployment and namespace events to perform necessary actions.

## Container Images



### 1. Module Exports:
   - **Name and Version:** The module is named "k8s.images" with version 1.
   - **Mixins:** Includes mixins for a database service (`DbService`) and configuration loading (`ConfigLoader`).

### 2. Dependencies:
   - An empty array, indicating no external dependencies.

### 3. Settings:
   - **REST Configuration:** Specifies the REST endpoint for image-related operations (`/v1/k8s/images`).
   - **Fields:** Defines fields for the image service, including those from the database service.
   - **Scopes:** Specifies default scopes for the database.
   - **Default Scopes:** Specifies default database scopes.
   - **Config:** Empty configuration object.

### 4. Actions:
   - **clean:** Removes all entities.
   - **getImage:** Retrieves an image by name.
   - **build:** Builds an image.
   - **loadImages:** Loads images from a directory (`./images`).
   - **deploy:** Deploys an image to Kubernetes, creating a deployment.

### 5. Events:
   - Empty, indicating no event handlers in this service.

### 6. Methods:
   - **createDeployment:** Creates a deployment in Kubernetes.

### 7. Lifecycle Hooks:
   - **created, started, stopped:** Lifecycle hooks for additional initialization or cleanup.

### 8. Action Details:

- **clean:**
  - **Handler:** Removes all entities.
- **getImage:**
  - **Handler:** Retrieves an image by name.
- **build:**
  - **Handler:** Builds an image.
- **loadImages:**
  - **Handler:** Loads images from the `./images` directory, either updating existing entities or creating new ones.
- **deploy:**
  - **REST Configuration:** Exposes a `POST` endpoint for deployment.
  - **Handler:** Deploys an image to Kubernetes by creating a deployment.
  - **Parameters:**
    - `id`: Image ID (required).
    - `namespace`: Namespace where the deployment will be created (optional).
    - `name`: Deployment name (optional).
    - `vHosts`: Virtual hosts for the deployment (optional).
    - `replicas`: Number of replicas (optional).

### 9. Functionality:
   - The `clean` action removes all image entities.
   - The `getImage` action retrieves an image by name.
   - The `build` action is intended to build an image but lacks the complete implementation.
   - The `loadImages` action loads images from a directory, updating existing entities or creating new ones.
   - The `deploy` action deploys an image to Kubernetes by creating a deployment. It supports specifying deployment details like namespace, name, virtual hosts, and replicas.

### 10. Deployment Functionality (Inside `deploy` action):
   - Checks if the image exists.
   - Resolves the namespace.
   - Resolves the deployment.
   - Validates deployment existence.
   - If virtual hosts are not specified, generates a default route.
   - Creates the deployment using the `createDeployment` method.
