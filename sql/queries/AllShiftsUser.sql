

-- All shiffts for a user including requested shifts
select distinct shift.id, start_utc, end_utc, shift.status from shift, request where request.user_id=16025167791191866744 AND shift.id=request.shift_id AND request.status<>'cancelled' AND shift.status<>'cancelled';

-- All available shifts in area that don't overlap with user shifts as above
SELECT `shift`.`id`, `shift`.`job_id`, `shift`.`max_rate`, `shift`.`start_utc`, `shift`.`end_utc`, `shift`.`premises_id`, `shift`.`currency_id`, `premises`.`organisation_id`  FROM (SELECT distinct sh1.id FROM shift AS sh1, (SELECT distinct shift.id, start_utc, end_utc, shift.status FROM shift, request WHERE request.user_id = ? AND shift.id=request.shift_id AND request.status<>'cancelled' AND shift.status<>'cancelled') AS sh2 WHERE `shift`.`status`="published" AND `start_utc` > NOW() AND `premises`.`lat` >= ? AND `premises`.`lat` <= ? AND `premises`.`lng` >= ? AND `premises`.`lng` <= ? AND sh1.user_id<> ? AND NOT overlaps(sh1.start_utc, sh1.end_utc, sh2.start_utc, sh2.end_utc)) AS shift, premises WHERE `premises`.`id` = `shift`.`premises_id`;

[ userId, minLat, maxLat, minLng, maxLng, userId ]