CREATE TABLE Contact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NULL,
    phoneNumber VARCHAR(20) NULL,
    linkedId INT NULL,
    linkPrecedence ENUM('primary', 'secondary') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP NULL
);