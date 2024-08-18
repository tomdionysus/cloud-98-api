-- Fix emails in test system to they all go to <x>-test@cloud98.blackraven.co.nz


--
--
--         BE CAREFUL! RUNNING THIS ON prod WILL FUCK EVERYTHING UP!
--
--

UPDATE user SET email = CONCAT(REPLACE(REPLACE(email,'.','DOT'),'@','AT'),'-user-test@cloud98.blackraven.co.nz');
UPDATE organisation SET invoicing_email = CONCAT(REPLACE(REPLACE(invoicing_email,'.','DOT'),'@','AT'),'-org-test@cloud98.blackraven.co.nz');
update user set email='mail@tomcully.com' where email='mailATtomcullyDOTcom-user-test@cloud98.blackraven.co.nz';