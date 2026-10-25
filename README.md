# Parks and Recreational Facilities Management - Web GIS

A database-driven Web GIS application for parks, playgrounds, walking tracks and sports grounds in
Islamabad and Rawalpindi. Data is stored in PostgreSQL/PostGIS, served by a Node.js + Express API,
and displayed on a Leaflet map with search, filtering, and add/update/delete forms.

## Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer with the PostGIS extension
- pgAdmin 4 (or any SQL client)

## 1. Set up the database

1. In pgAdmin, create a database named `parks_gis`.
2. Open the Query Tool on `parks_gis`.
3. Open `sql/create_and_populate.sql` and run Parts 1 to 3. This enables PostGIS, creates the
   `parks` table, and inserts 22 records.
4. Check it worked with `SELECT COUNT(*) FROM parks;` (it should return 22).

## 2. Configure the backend

1. Open a terminal in the `server` folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to a new file named `.env` and enter your own PostgreSQL password:

   ```
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=parks_gis
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   ```

   The `.env` file holds secrets and is not included in this submission.

## 3. Run the application

```bash
cd server
node server.js
```

Open **http://localhost:3000** in your browser (do not open the HTML file directly or use Live Server,
because the API is served by Express).

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/parks` | All records as GeoJSON. Optional filters: `city`, `facility_type`, `condition`, `search` |
| GET | `/api/parks/:id` | One record |
| POST | `/api/parks` | Add a record (validated) |
| PUT | `/api/parks/:id` | Update a record (validated) |
| DELETE | `/api/parks/:id` | Delete a record |
| GET | `/api/stats` | Record counts by city and facility type |

## Features

- Live map data loaded from PostgreSQL/PostGIS
- Search by name or area, plus filters for city, facility type and condition
- Add and update records through a form; click the map to set the location
- Input validation on both the website and the server (required fields, allowed values,
  coordinates restricted to the Islamabad/Rawalpindi area)
- Three base maps (OpenStreetMap, Satellite, Terrain) and a legend that can toggle facility types
- Changes persist in the database after a page refresh

## Project structure

```text
Assignment_2/
├── sql/
│   └── create_and_populate.sql
├── server/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── report.pdf
└── README.md
```

## Data sources

Locations were collected from public map references and checked against Google Maps. Records added
through the website are marked "Added via website" in the `data_source` column.
