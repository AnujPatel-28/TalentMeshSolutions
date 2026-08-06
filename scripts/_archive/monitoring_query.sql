-- Admin Monitoring Query: Resume access count grouped by date
-- Grouped by date in descending order to track daily activity

SELECT
  DATE(created_at) AS access_date,
  COUNT(*) AS access_count
FROM public.resume_access_log
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
