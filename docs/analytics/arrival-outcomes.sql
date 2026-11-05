-- BigQuery Standard SQL. Replace YOUR_PROJECT.analytics_557271056 with the verified export dataset.
-- No export is created by this change; query has not been executed against production.
-- Parameters: @start_date DATE, @end_date DATE,
-- @historical_exclude_florida BOOL (default FALSE), @historical_through DATE.
-- Set historical_through to the last day BEFORE the owner-approved internal-marker release.
-- Florida is NEVER excluded after that cutoff. Compare both historical versions side by side.
WITH raw AS (
 SELECT event_date, event_timestamp, event_name, user_pseudo_id,
   (SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') sid,
   (SELECT value.string_value FROM UNNEST(event_params) WHERE key='action') action,
   (SELECT value.string_value FROM UNNEST(event_params) WHERE key='page_path') path,
   (SELECT value.string_value FROM UNNEST(event_params) WHERE key='input_method') method,
   geo.region region, device.category device,
   COALESCE(JSON_VALUE(TO_JSON_STRING(session_traffic_source_last_click),'$.cross_channel_campaign.source'),
            JSON_VALUE(TO_JSON_STRING(session_traffic_source_last_click),'$.manual_campaign.source'),'(unknown)') source,
   COALESCE(JSON_VALUE(TO_JSON_STRING(session_traffic_source_last_click),'$.cross_channel_campaign.medium'),
            JSON_VALUE(TO_JSON_STRING(session_traffic_source_last_click),'$.manual_campaign.medium'),'(unknown)') medium,
   COALESCE(JSON_VALUE(TO_JSON_STRING(session_traffic_source_last_click),'$.cross_channel_campaign.campaign_name'),
            JSON_VALUE(TO_JSON_STRING(session_traffic_source_last_click),'$.manual_campaign.campaign_name'),'(unknown)') campaign
 FROM `YOUR_PROJECT.analytics_557271056.events_*`
 WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d',DATE_SUB(@start_date,INTERVAL 1 DAY))
                         AND FORMAT_DATE('%Y%m%d',DATE_ADD(@end_date,INTERVAL 1 DAY))
), e AS (
 SELECT * FROM raw WHERE user_pseudo_id IS NOT NULL AND sid IS NOT NULL
 AND DATE(TIMESTAMP_SECONDS(sid),'America/New_York') BETWEEN @start_date AND @end_date
), times AS (
 SELECT user_pseudo_id,sid,
   MIN(IF(event_name='rigby_encounter' AND action='shown',event_timestamp,NULL)) exposed_at,
   MIN(IF(event_name='rigby_play' OR (event_name IN ('rigby_cookie','rigby_encounter') AND action='fed'),event_timestamp,NULL)) played_at,
   MIN(IF(event_name='evaluation_submitted',event_timestamp,NULL)) submitted_at,
   MIN(IF(event_name='evaluation_completed',event_timestamp,NULL)) completed_at,
   MIN(IF(event_name='evaluation_result_viewed',event_timestamp,NULL)) result_at
 FROM e GROUP BY 1,2
), per_session AS (
 SELECT e.user_pseudo_id,e.sid,DATE(TIMESTAMP_SECONDS(e.sid),'America/New_York') date,
   ARRAY_AGG(STRUCT(e.source,e.medium,e.campaign,e.device) ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] acquisition,
   ARRAY_AGG(IF(event_name='page_view',path,NULL) IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)] landing,
   t.exposed_at IS NOT NULL exposed,t.played_at IS NOT NULL interacted,
   COUNTIF(event_name='rigby_encounter' AND action='dismissed')>0 dismissed,
   COUNTIF(event_name='rigby_encounter' AND action='dismissed' AND (t.played_at IS NULL OR event_timestamp<t.played_at))>0 dismissed_without_prior_play,
   COUNTIF(event_name='rigby_encounter' AND action='dismissed' AND event_timestamp>=t.played_at)>0 played_then_dismissed,
   COUNTIF(event_name='rigby_encounter' AND action='saved_off')>0 saved_off,
   COUNTIF(event_name='rigby_encounter' AND action='brought_back')>0 brought_back,
   COUNTIF(event_name='rigby_cookie' AND action='collected') cookie_discoveries,
   COUNTIF(event_name='rigby_cookie' AND action='fed') cookie_deliveries,
   COUNT(DISTINCT IF(event_name='page_view' AND event_timestamp>t.exposed_at AND
     REGEXP_CONTAINS(path,r'^/(engineering|ux-product|accessibility|ai|creative|impact|work/[^/]+|case-studies/[^/]+|blognostisphere/[^/]+)$'),path,NULL)) distinct_content_after_exposure,
   COUNTIF(event_timestamp>t.played_at AND event_name IN ('resume_download','contact_click','evaluation_completed'))>0 meaningful_after_play,
   COUNTIF(event_timestamp>t.result_at AND event_name IN ('case_study_view','evidence_view','resume_download','contact_click','external_profile_click'))>0 followthrough_after_result,
   COUNTIF(event_name='thingamajob_open')>0 thingamajob_open,
   COUNTIF(event_name='page_view' AND path='/thingamajob')>0 thingamajob_visited,
   COUNTIF(event_name='evaluation_input_selected')>0 method_selected,
   COUNTIF(event_name='evaluation_file_selected')>0 file_selected,
   COUNTIF(event_name='evaluation_input_prepared')>0 input_prepared,
   COUNTIF(event_name='evaluation_submitted') submissions,
   COUNTIF(event_name='evaluation_completed') completions,
   COUNTIF(event_name='evaluation_failed') failures,
   COUNTIF(event_name='evaluation_result_viewed')>0 result_viewed,
   COUNTIF(event_name='resume_download')>0 resume_intent,
   COUNTIF(event_name='contact_click')>0 contact_intent,
   COUNTIF(event_name='external_profile_click')>0 profile_intent,
   LOGICAL_OR(region='Florida' AND PARSE_DATE('%Y%m%d',event_date)<=@historical_through) historical_florida
 FROM e JOIN times t USING(user_pseudo_id,sid)
 GROUP BY e.user_pseudo_id,e.sid,t.exposed_at,t.played_at,t.submitted_at,t.completed_at,t.result_at
)
SELECT date,acquisition.source source,acquisition.medium medium,acquisition.campaign campaign,acquisition.device device,landing,
 COUNT(*) recorded_sessions,
 COUNTIF(exposed) exposed_sessions,COUNTIF(exposed AND NOT interacted AND NOT dismissed) exposed_no_recorded_interaction,
 COUNTIF(interacted) interacted_sessions,COUNTIF(dismissed) dismissed_sessions,
 COUNTIF(dismissed_without_prior_play) dismissed_without_prior_play_sessions,
 COUNTIF(played_then_dismissed) played_then_dismissed_sessions,
 COUNTIF(saved_off) saved_off_sessions,COUNTIF(brought_back) brought_back_sessions,
 SUM(cookie_discoveries) cookie_discoveries,SUM(cookie_deliveries) cookie_deliveries,
 COUNTIF(distinct_content_after_exposure>0) exposed_with_later_content,
 SAFE_DIVIDE(COUNTIF(distinct_content_after_exposure>0),COUNTIF(exposed)) later_content_rate,
 SUM(distinct_content_after_exposure) distinct_content_session_pairs,
 COUNTIF(meaningful_after_play) play_with_later_meaningful_outcome,
 COUNTIF(thingamajob_open) thingamajob_link_intent_sessions,
 COUNTIF(thingamajob_visited) thingamajob_visit_sessions,
 COUNTIF(method_selected) method_selected_sessions,COUNTIF(file_selected) file_selected_sessions,
 COUNTIF(input_prepared) prepared_sessions,COUNTIF(submissions>0) submitted_sessions,
 COUNTIF(completions>0) completed_sessions,COUNTIF(failures>0) failed_sessions,
 SUM(submissions) submission_events,SUM(completions) completion_events,SUM(failures) failure_events,
 COUNTIF(result_viewed) result_viewed_sessions,COUNTIF(followthrough_after_result) result_with_later_portfolio_action,
 COUNTIF(resume_intent) resume_intent_sessions,COUNTIF(contact_intent) contact_intent_sessions,
 COUNTIF(profile_intent) profile_intent_sessions
FROM per_session
WHERE NOT (@historical_exclude_florida AND historical_florida)
GROUP BY 1,2,3,4,5,6 ORDER BY date,recorded_sessions DESC;
