# Productivity Detox Platform

##  Overview
The Productivity Detox Platform is a Java-based application designed to help users reduce digital distractions and improve their focus and productivity. The system tracks user activities, manages focus sessions, and provides structured data handling using a backend architecture.

## Objectives
- Minimize user distractions
- Improve focus and efficiency
- Track productivity sessions
- Provide structured data management

## Features
- Focus Session Management
- Productivity Tracking
- Database Integration (MySQL)
- Backend using Java & Maven
- Layered Architecture (Repository, Service, Controller)

## Technologies Used
- Java
- Maven
- MySQL
- SQL
- Spring Boot 

## Project Structure
src/
└── main/
└── java/
└── com.app.productivity/
├── controller/
├── service/
├── repository/
└── model/

- `src/` → Source code
- `pom.xml` → Project dependencies
- `database.sql` → Database setup

## How to Run the Project
1. Clone the repository  
2. Open the project in any IDE (VS code / IntelliJ / Eclipse)
3. Configure MySQL database using `database.sql`  
4. Update DB credentials in application properties  
5. Run the project  

## Database
- MySQL database is used
- Schema provided in `database.sql`
- Includes tables for managing productivity and focus sessions

## API / Functional Modules
- Focus Session Management (Start / Stop sessions)
- Data storage using repository layer
- Service layer handles business logic
- Controller manages user requests

## Conclusion
This project successfully demonstrates a backend system for managing productivity and focus sessions using Java and database integration.
This is a Maven-based Java backend project.
