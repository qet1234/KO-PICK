FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src src
COPY build-tools build-tools
RUN java build-tools/TourApiBuildPatch.java
RUN mvn -q clean package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/target/kopick-backend-0.1.0.jar app.jar
COPY docker-entrypoint.sh docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/app/docker-entrypoint.sh"]
