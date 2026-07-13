-- Raise employee profile image upload limit to 15 MB
UPDATE storage.buckets
SET file_size_limit = 15728640
WHERE id = 'employee-profile-images';
