# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.4](https://github.com/MRdevX/nestjs-queue-worker-poc/compare/v0.0.3...v0.0.4) (2025-08-16)


### Features

* **docs:** add invoice testing documentation and quick start guide ([fbf7842](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/fbf78422a08c71a93c1e827724172b5381a552bc))
* **messaging:** add NATS support and refactor messaging services ([ff5e288](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/ff5e2883f38c0f4f1584b70dcf198509ac2d03cc))
* **messaging:** add Redis transport support and refactor messaging module ([7342bb4](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/7342bb4bc9f949b66abb7d6dcd04a3240fbe6c80))
* **tests:** add comprehensive tests for task failure handling, compensation logic, and retry mechanisms in invoice workflows ([c6772a7](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/c6772a7dae72263a6fc824b16355fb5e98ee71ed))

### 0.0.3 (2025-08-04)


### Features

* **api:** expand API documentation and add new endpoints for fault and workflow management ([1a75051](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/1a7505149c84d66349df51434e0ffc8671327915))
* **api:** update Postman collection ([e0399f8](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/e0399f80fbd4afbfc18cd0c1f70084bb5bf62a93))
* **core:** integrate MessagingModule into CoreModule so other modules could use it without extra imports ([66d82dd](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/66d82dd8e4ea0ad10a6706627a22daa4c27c910c))
* **docker:** add Docker configuration files ([c92485f](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/c92485f410ea2fbf1507a8fd3ae853e0671bc846))
* **docs:** add comprehensive architecture documentation ([b573257](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/b5732570e355e61fef991cc74f44fe8c9a9a57bf))
* **event-emitter:** integrate @nestjs/event-emitter ([b1c7735](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/b1c7735c085e61329ff8d60592baec78e198a1f8))
* **fault:** add FaultModule and FaultService with initial test cases ([641a87a](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/641a87a57f549cdbcea1de79f4fb9b2255eb8b02))
* **fault:** enhance FaultService with retry and compensation handling ([f1013ce](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/f1013cea21c9b990b04476c71b12b7fe03240ade))
* **fault:** implement fault handling controller and service integration ([b2e40ab](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/b2e40abf803c5ac28809587fd1b1d1bd508b57c9))
* **health:** add health check module ([b0eea81](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/b0eea81d21757436a6adf09dec00fb9e05fba367))
* **invoice:** add invoice configuration, service, and refactor controller to streamline invoice workflows ([ddceb30](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/ddceb30638e7b74aa21f7f0d5ee09ee5e4df239b))
* **invoice:** implement comprehensive invoice workflow with new workers, controllers, and API endpoints ([3a898ac](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/3a898ac29181eac377ee0d67b707aa8463e95d90))
* **invoice:** introduce InvoiceCoordinatorService and integrate with task handling workflow ([1662b85](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/1662b854cccde7a553dd6ee0dc6c1d84f3707b28))
* **messaging:** add dead letter queue options ([ed9aec5](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/ed9aec558f0358037ff4b90297709a28935bc221))
* **messaging:** implement RabbitMQ setup service and update messaging configuration ([053fedd](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/053fedda6dcda8ba7d42236a7370d28db809526c))
* **mock:** add mock factories for entities ([e47a19b](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/e47a19b8ec24078fab346e4702009b71cf383ce9))
* **postman:** add Postman collection and environment setup for Queue Worker POC API ([351582c](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/351582c4440ebfb0d48882b8a6b9dd05c122a007))
* **postman:** update Postman collection and documentation ([1ecdbef](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/1ecdbefe9062b1782ddd4d0fc2271e0772332af1))
* **queue:** add QueueManagerModule for queue management and status monitoring ([38ff1c7](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/38ff1c7e19aee61ce065e83e97ef64ed57a8ef98))
* **queue:** implement QueueController for task management and status retrieval ([6a76fab](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/6a76fabac43d756128d3a1d3b43b94f3f2f8c2e6))
* **queue:** implement task enqueueing and retry functionality ([23240ca](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/23240caccb67b8005f354bee7c2d3aa8effc4e1e))
* **repository:** implement BaseRepository and TaskRepository for task management ([de3988f](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/de3988f6eea0d7df19cb86b0ceb5342703c5a6ee))
* **scheduler:** implement scheduling functionality with SchedulerModule and related services ([aa50f81](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/aa50f81b75ef1b639d3ccd8595687141f487b69d))
* **seeder:** enhance workflow seeding ([6ac40a9](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/6ac40a94b78eced44f4a430eac8234ebd714bb0d))
* **seeder:** implement database seeding functionality ([a35ec37](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/a35ec37fe942d708ac2ba614d1bd08f67da87c58))
* **seeder:** overhaul database seeding functionality with dynamic data generation and improved configuration options ([4e9ba25](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/4e9ba25ed9185260c1151aaca8d16474a0829031))
* **task:** add TaskController and update TaskService for task management ([3d2f137](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/3d2f137c2215eec7364a4b9dae0f4e57ea5263d3))
* **task:** enhance task querying and update messaging configuration for RabbitMQ ([0be47df](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/0be47df76bb2c2bd726d1bbca399a1a81d587a1c))
* **task:** implement TaskLogRepository for logging task execution ([474fe6b](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/474fe6b8c75ce4a1e22f5ea39bbd1d55ff5fb8ea))
* **task:** implement TaskService for task management and logging ([50720a9](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/50720a9bd21fa760d929cecb66840832d6ded802))
* **tests:** add comprehensive invoice testing documentation and automated script for workflow validation ([db09c0c](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/db09c0c12a8b479bf3047fdf499fe80c0976ea6f))
* **tests:** add comprehensive invoice workflow tests and new test script for invoice processing ([061db49](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/061db490a8ec2c27376dab48c3e99d1330d264cb))
* **tests:** add comprehensive unit and integration tests for task management, including TaskService, TaskController, and repositories ([7c11cde](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/7c11cde364a462416d1592144a8ca415af1e8097))
* **tests:** add integration and unit tests for FaultModule ([96ca498](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/96ca49887c58c0f8def73e1474cd889852a73d82))
* **tests:** add unit and integration tests for MessagingModule ([5b7a333](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/5b7a33357f011370b938fcab0604465136656f00))
* **tests:** add unit and integration tests for QueueManager ([787ae39](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/787ae39e8ffb5668c4b892f5960e08364d52294c))
* **tests:** add unit and integration tests for SchedulerModule ([0b9a8b0](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/0b9a8b04e5f7a755ca5a67f95a14b364241e3a39))
* **tests:** add unit and integration tests for WorkflowModule ([167283c](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/167283c91c8364a000fe7847af8d0331909faef8))
* **tests:** add unit tests for all worker classes ([0dad2eb](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/0dad2eb73d63fa9212e6d9427217814dcd034857))
* **tests:** enhance comprehensive invoice workflow tests with order filtering, item validation, date range checks, and PDF/email integration ([f2b999a](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/f2b999a65d0a4cf801b221a54144e708f97dde83))
* **worker:** add CompensationWorker and enhance task handling ([e6aea46](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/e6aea46cb6b8aee61702e9e97374282b25901a55))
* **worker:** add WorkerModule with DataWorker and HttpWorker for task processing ([913bb83](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/913bb83e5b9dffe8349ff58afac1569b1c91026a))
* **worker:** enhance workers with task type handling and logging improvements ([2925c92](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/2925c9204f6cde6caa33fc77c2689df7f52fd692))
* **workflow:** add CoordinatorService for workflow management and task publishing ([080115d](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/080115dd796c4c7ab7b6e654e27b351df18854ec))
* **workflow:** add Task and Workflow modules with their entities ([123e72e](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/123e72e3938088e23c0290056010fee262a3494d))
* **workflow:** implement dynamic retry configuration and enhance workflow status management ([c71eea8](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/c71eea8ec263fcc423a7171854173304a837e38d))


### Bug Fixes

* **core:** make MessagingModule global ([01d575b](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/01d575bd78c4252138708c9f79387f52d166ca3f))
* **docker:** update HOST environment variable in docker-compose to allow external access ([63de406](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/63de406b8124c7420f378370da680e40b1447b64))
* **tests:** update test module providers ([9ca848f](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/9ca848f1fe7ad09ce7747f1f4447ea52b7e99e5d))

### 0.0.2 (2025-07-30)


### Features

* **core:** integrate MessagingModule into CoreModule so other modules could use it without extra imports ([66d82dd](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/66d82dd8e4ea0ad10a6706627a22daa4c27c910c))
* **docker:** add Docker configuration files ([c92485f](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/c92485f410ea2fbf1507a8fd3ae853e0671bc846))
* **docs:** add comprehensive architecture documentation ([b573257](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/b5732570e355e61fef991cc74f44fe8c9a9a57bf))
* **fault:** add FaultModule and FaultService with initial test cases ([641a87a](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/641a87a57f549cdbcea1de79f4fb9b2255eb8b02))
* **fault:** enhance FaultService with retry and compensation handling ([f1013ce](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/f1013cea21c9b990b04476c71b12b7fe03240ade))
* **health:** add health check module ([b0eea81](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/b0eea81d21757436a6adf09dec00fb9e05fba367))
* **messaging:** add dead letter queue options ([ed9aec5](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/ed9aec558f0358037ff4b90297709a28935bc221))
* **mock:** add mock factories for entities ([e47a19b](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/e47a19b8ec24078fab346e4702009b71cf383ce9))
* **queue:** add QueueManagerModule for queue management and status monitoring ([38ff1c7](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/38ff1c7e19aee61ce065e83e97ef64ed57a8ef98))
* **queue:** implement QueueController for task management and status retrieval ([6a76fab](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/6a76fabac43d756128d3a1d3b43b94f3f2f8c2e6))
* **repository:** implement BaseRepository and TaskRepository for task management ([de3988f](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/de3988f6eea0d7df19cb86b0ceb5342703c5a6ee))
* **scheduler:** implement scheduling functionality with SchedulerModule and related services ([aa50f81](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/aa50f81b75ef1b639d3ccd8595687141f487b69d))
* **task:** add TaskController and update TaskService for task management ([3d2f137](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/3d2f137c2215eec7364a4b9dae0f4e57ea5263d3))
* **task:** implement TaskLogRepository for logging task execution ([474fe6b](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/474fe6b8c75ce4a1e22f5ea39bbd1d55ff5fb8ea))
* **task:** implement TaskService for task management and logging ([50720a9](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/50720a9bd21fa760d929cecb66840832d6ded802))
* **tests:** add comprehensive unit and integration tests for task management, including TaskService, TaskController, and repositories ([7c11cde](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/7c11cde364a462416d1592144a8ca415af1e8097))
* **tests:** add integration and unit tests for FaultModule ([96ca498](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/96ca49887c58c0f8def73e1474cd889852a73d82))
* **tests:** add unit and integration tests for MessagingModule ([5b7a333](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/5b7a33357f011370b938fcab0604465136656f00))
* **tests:** add unit and integration tests for QueueManager ([787ae39](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/787ae39e8ffb5668c4b892f5960e08364d52294c))
* **tests:** add unit and integration tests for SchedulerModule ([0b9a8b0](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/0b9a8b04e5f7a755ca5a67f95a14b364241e3a39))
* **tests:** add unit and integration tests for WorkflowModule ([167283c](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/167283c91c8364a000fe7847af8d0331909faef8))
* **tests:** add unit tests for all worker classes ([0dad2eb](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/0dad2eb73d63fa9212e6d9427217814dcd034857))
* **worker:** add CompensationWorker and enhance task handling ([e6aea46](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/e6aea46cb6b8aee61702e9e97374282b25901a55))
* **worker:** add WorkerModule with DataWorker and HttpWorker for task processing ([913bb83](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/913bb83e5b9dffe8349ff58afac1569b1c91026a))
* **worker:** enhance workers with task type handling and logging improvements ([2925c92](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/2925c9204f6cde6caa33fc77c2689df7f52fd692))
* **workflow:** add CoordinatorService for workflow management and task publishing ([080115d](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/080115dd796c4c7ab7b6e654e27b351df18854ec))
* **workflow:** add Task and Workflow modules with their entities ([123e72e](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/123e72e3938088e23c0290056010fee262a3494d))


### Bug Fixes

* **core:** make MessagingModule global ([01d575b](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/01d575bd78c4252138708c9f79387f52d166ca3f))
* **tests:** update test module providers ([9ca848f](https://github.com/MRdevX/nestjs-queue-worker-poc/commit/9ca848f1fe7ad09ce7747f1f4447ea52b7e99e5d))
