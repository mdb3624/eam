FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml checkstyle.xml pmd-ruleset.xml ./
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -Djacoco.skip=true -Dcheckstyle.skip=true -Dpmd.skip=true -q

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system appgroup && useradd --system --gid appgroup --home-dir /app appuser \
    && chown -R appuser:appgroup /app
USER appuser
COPY --from=build /app/target/eam-backend-*.jar app.jar
EXPOSE 8180
ENTRYPOINT ["java", "-jar", "app.jar"]
