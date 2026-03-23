-- USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) CHECK(role IN ('DOCTOR' , 'PHARMA', 'ADMIN')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCTOR  PROFILE
CREATE TABLE doctor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(100),
    registration_year INTEGER,
    state_medical_council VARCHAR(100),
    specialty VARCHAR(100),
    bio TEXT,
    qualification VARCHAR(100),
    experience INTEGER,
    hospital  VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    profile_image_url TEXT, 
    status VARCHAR(20) CHECK(status IN ('VERIFIED' , 'PENDING', 'REJECTED')) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHARMA  PROFILE
CREATE TABLE pharma_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PROFILE VIEW TABLE
CREATE TABLE profile_views (
  id SERIAL PRIMARY KEY,
  viewer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  doctor_profile_id INTEGER REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USERS TABLE INDEXES
-- Fast lookup for login/signup
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- DOCTOR PROFILES INDEXES
-- For JOIN with users
CREATE INDEX idx_doctor_user_id ON doctor_profiles(user_id);
-- Filter by city
CREATE INDEX idx_doctor_city ON doctor_profiles(city);
-- Filter by specialty
CREATE INDEX idx_doctor_specialty ON doctor_profiles(specialty);
-- Filter by experience
CREATE INDEX idx_doctor_experience ON doctor_profiles(experience);
-- Filter on doctor status
CREATE INDEX idx_doctor_pending ON doctor_profiles(created_at DESC) WHERE status = 'PENDING';
CREATE INDEX idx_doctor_verified ON doctor_profiles(created_at DESC) WHERE status = 'VERIFIED';
-- Combined filter (city + specialty + experience)
CREATE INDEX idx_doctor_city_specialty_experience 
ON doctor_profiles(city, specialty, experience);


-- PHARMA PROFILES INDEXES
-- For JOIN with users
CREATE INDEX idx_pharma_user_id ON pharma_profiles(user_id);

-- PROFILE VIEWS INDEXES
CREATE INDEX idx_profile_views_viewer ON profile_views(viewer_user_id);
CREATE INDEX idx_profile_views_doctor ON profile_views(doctor_profile_id);
CREATE INDEX idx_profile_views_time ON profile_views(viewed_at);