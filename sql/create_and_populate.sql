-- =====================================================================
-- Assignment 2 - Parks and Recreational Facilities Management
-- Database: parks_gis (PostgreSQL + PostGIS)

-- ---------------------------------------------------------------------
-- PART 1: Enable PostGIS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;


-- ---------------------------------------------------------------------
-- PART 2: Create the spatial table
-- geom stores each facility as a point (longitude, latitude) in WGS 84 (SRID 4326).
-- CHECK constraints stop invalid values from being stored.
-- ---------------------------------------------------------------------
-- DROP TABLE IF EXISTS parks;   -- uncomment only if you want to start over (deletes all rows)

CREATE TABLE IF NOT EXISTS parks (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    facility_type VARCHAR(30)  NOT NULL
                  CHECK (facility_type IN ('Park', 'Playground', 'Walking Track', 'Sports Ground')),
    city          VARCHAR(30)  NOT NULL,
    area          VARCHAR(100),
    entry_fee     NUMERIC(8,2) DEFAULT 0,
    opening_hours VARCHAR(50),
    amenities     TEXT,
    condition     VARCHAR(20)  DEFAULT 'Good'
                  CHECK (condition IN ('Good', 'Fair', 'Poor')),
    data_source   VARCHAR(100),
    geom          GEOMETRY(Point, 4326) NOT NULL
);

-- Spatial index for faster map queries
CREATE INDEX IF NOT EXISTS idx_parks_geom ON parks USING GIST (geom);


-- ---------------------------------------------------------------------
-- PART 3: Populate with 22 records (Islamabad and Rawalpindi)
-- ST_MakePoint takes LONGITUDE first, then LATITUDE.
-- Coordinates were collected from map references and should be checked on Google Maps.
-- ---------------------------------------------------------------------
INSERT INTO parks (name, facility_type, city, area, entry_fee, opening_hours, amenities, condition, data_source, geom) VALUES
('Fatima Jinnah Park', 'Park', 'Islamabad', 'F-9', 0, '6am-10pm', 'Jogging track, playground, restrooms, food court', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0300, 33.7065), 4326)),
('Lake View Park', 'Park', 'Islamabad', 'Rawal Lake', 20, '8am-8pm', 'Lake view, picnic area, parking', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0900, 33.7050), 4326)),
('Shakarparian National Park', 'Park', 'Islamabad', 'Shakarparian', 0, '6am-8pm', 'Walking paths, viewpoint, parking', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0820, 33.6890), 4326)),
('Pakistan Monument Park', 'Park', 'Islamabad', 'Shakarparian', 50, '8am-8pm', 'Lawns, museum, parking', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0685, 33.6930), 4326)),
('Daman-e-Koh Viewpoint', 'Park', 'Islamabad', 'Margalla Hills', 0, '24 hours', 'Viewpoint, restaurants, parking', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0555, 33.7445), 4326)),
('Margalla Trail 3', 'Walking Track', 'Islamabad', 'Margalla Hills', 0, 'Sunrise-sunset', 'Hiking trail, water points', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0600, 33.7340), 4326)),
('Margalla Trail 5', 'Walking Track', 'Islamabad', 'Margalla Hills', 0, 'Sunrise-sunset', 'Hiking trail', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0650, 33.7200), 4326)),
('Rose and Jasmine Garden', 'Park', 'Islamabad', 'Shakarparian', 20, '8am-6pm', 'Flower gardens, walking paths', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0860, 33.6960), 4326)),
('Jinnah Garden', 'Park', 'Islamabad', 'Constitution Avenue', 0, '6am-9pm', 'Lawns, walking paths', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0770, 33.7120), 4326)),
('F-9 Park Playground', 'Playground', 'Islamabad', 'F-9', 0, '6am-10pm', 'Swings, slides', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0310, 33.7075), 4326)),
('Jinnah Sports Stadium', 'Sports Ground', 'Islamabad', 'G-5', 0, '9am-9pm', 'Football ground, athletics track', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0620, 33.7150), 4326)),
('Islamabad Sports Complex', 'Sports Ground', 'Islamabad', 'G-8', 0, '9am-9pm', 'Multiple courts, running track', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0400, 33.7000), 4326)),
('Sector I-8 Park', 'Park', 'Islamabad', 'I-8', 0, '6am-9pm', 'Jogging track, benches', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0750, 33.6650), 4326)),
('Sector G-10 Park', 'Park', 'Islamabad', 'G-10', 0, '6am-9pm', 'Open lawn, benches', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0150, 33.6800), 4326)),
('Ayub National Park', 'Park', 'Rawalpindi', 'Murree Road', 0, '7am-9pm', 'Lake, playground, walking tracks', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0670, 33.6000), 4326)),
('Jinnah Park Rawalpindi', 'Park', 'Rawalpindi', 'Murree Road', 0, '6am-10pm', 'Jogging track, playground', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0580, 33.6050), 4326)),
('Liaquat Bagh', 'Park', 'Rawalpindi', 'Liaquat Road', 0, '6am-8pm', 'Public garden, benches', 'Poor', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0485, 33.6005), 4326)),
('Ayub Park Playground', 'Playground', 'Rawalpindi', 'Murree Road', 10, '7am-8pm', 'Swings, slides, rides', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0680, 33.6010), 4326)),
('Rawalpindi Cricket Stadium', 'Sports Ground', 'Rawalpindi', 'Pindi Club Road', 0, 'Event days', 'Cricket ground, parking', 'Good', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0764, 33.6355), 4326)),
('Race Course Ground', 'Sports Ground', 'Rawalpindi', 'Race Course', 0, '6am-9pm', 'Open ground, jogging track', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0630, 33.6070), 4326)),
('Gulzar-e-Quaid Park', 'Park', 'Rawalpindi', 'Gulzar-e-Quaid', 0, '6am-9pm', 'Lawns, walking track', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0970, 33.6280), 4326)),
('Chaklala Scheme III Park', 'Park', 'Rawalpindi', 'Chaklala', 0, '6am-9pm', 'Playground, benches', 'Fair', 'Approximate, verify on Google Maps', ST_SetSRID(ST_MakePoint(73.0950, 33.6000), 4326));


-- ---------------------------------------------------------------------
-- PART 4: Example queries (run one at a time)
-- ---------------------------------------------------------------------

-- 4.1 Retrieve all records with readable coordinates
SELECT id, name, facility_type, city, area, condition,
       ST_X(geom) AS longitude, ST_Y(geom) AS latitude
FROM parks
ORDER BY id;

-- 4.2 Filter: parks in Islamabad
SELECT name, area, entry_fee FROM parks
WHERE city = 'Islamabad' AND facility_type = 'Park';

-- 4.3 Filter: free facilities in good condition
SELECT name, facility_type, city FROM parks
WHERE entry_fee = 0 AND condition = 'Good';

-- 4.4 Count records by city
SELECT city, COUNT(*) AS total FROM parks GROUP BY city ORDER BY city;

-- 4.5 Count records by facility type
SELECT facility_type, COUNT(*) AS total FROM parks GROUP BY facility_type ORDER BY total DESC;

-- 4.6 Spatial query: the 5 facilities closest to a point in central Islamabad
SELECT name, city,
       ROUND(ST_Distance(geom::geography,
             ST_SetSRID(ST_MakePoint(73.0479, 33.6844), 4326)::geography)) AS distance_m
FROM parks
ORDER BY distance_m
LIMIT 5;

-- 4.7 Update a single record
UPDATE parks SET condition = 'Fair' WHERE name = 'Liaquat Bagh';

-- 4.8 Update many records (after verifying coordinates on Google Maps)
-- UPDATE parks SET data_source = 'Google Maps, verified Oct 2026'
-- WHERE data_source = 'Approximate, verify on Google Maps';
