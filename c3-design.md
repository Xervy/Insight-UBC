## Graded Area: Buildings/Rooms

# Architecture:
src/
  app.ts
  routes/
    datasetsRoutes.ts
    searchRoutes.ts
    courseRoutes.ts
    buildingRoutes.ts
  controllers/
    datasetsController.ts
    searchController.ts
    courseController.ts
    buildingController.ts
  services/
    dataset/
      uploadService.ts
      courseOfferingsIngestService.ts
      facilitiesIngestService.ts
    search/
      queryValidationService.ts
      queryExecutionService.ts
    resources/
      courseService.ts
      sectionService.ts
      buildingService.ts
      roomService.ts
  repositories/
    courseRepository.ts
    sectionRepository.ts
    buildingRepository.ts
    roomRepository.ts
    jobRepository.ts
  models/
    course.ts
    section.ts
    building.ts
    room.ts
    uploadJob.ts
  middleware/
    validateBody.ts
    validateParams.ts
    handleErrors.ts
    parsePagination.ts
  storage/
    fileStore.ts
  utils/
    html-parsing.ts

# How will services access repositories?

Direct Imports


# How will you structure validation?

Each Endpoint will manage its own validation rules


# How will you represent domain errors

Custom error subclasses:
Controllers will use a trycatch, and Services will throw a new error type that has a json object field that the controller will send.
In the case of Status Code 204 where the building/room already exists, there is a new error type for that which is thrown by the Services.
Controllers who can send SC 204, will then figure out what type of error was thrown and decide which status code and body to send.


# How will you organize your modules

Per Layer: All Controllers together, Services, Repositories, etc.


# Request Flow: put("/api/v2/buildings/b)

Request comes from App.ts -> buildingRoutes.ts -> buildingController.ts -> buildingService.ts -> repositories.ts


# Proud of:
BEFORE:
https://github.students.cs.ubc.ca/CPSC310-2025W-T2/project_team037/blob/fba9ef27df2c0a8f4f8e20fa6543d2219dd03a5a/src/controllers/buildingController.ts#L22-L42

AFTER:
https://github.students.cs.ubc.ca/CPSC310-2025W-T2/project_team037/blob/470d0e6b6559d136fcce8668e380059bfad0ddb7/src/controllers/buildingController.ts#L22-L44

buildingController functions no longer need to call a helper to make a json object to send to the server. The error that is thrown from buildingService provides that

# Remaining Technical Debt
- Error-handling can be done in middleware instead of each service doing all of its error handlings.
- Helpers can be moved into their proper file in utils for ease of access and knowing what helper deals with what service.