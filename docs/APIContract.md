# Login/session

* POST /v1/session     - Login, generate session
* GET /v1/session      - Get session
* PATCH /v1/session    - Switch organisation
* DELETE /v1/session   - Logout

# General

## Notification
Scoped to this user

* GET /v1/notification                            - Get Notification records  // NOT IMPLEMENTED
* GET /v1/notification/current                    - Get Current Notification records (status = created|viewed)
* GET /v1/notification/{notification_id}          - Get Specific Notification records
* PATCH /v1/notification/{notification_id}        - Set Notification viewed
* DELETE /v1/notification/{notification_id}		  - Acknowledge specific notification

# Employer

## Premises
Scoped to current organisation

* POST /v1/employer/premises                      - Create premises
* GET /v1/employer/premises                       - Get all premises
* GET /v1/employer/premises/{premises_id}         - Get specific premises
* PATCH /v1/employer/premises/{premises_id}       - Update premises
* DELETE /v1/employer/premises/{premises_id}      - Close premises

## Shift
Scoped to current organisation

* POST /v1/employer/shift                         - Create a shift
* GET /v1/employer/shift                          - Get all shifts (embed premises)
* GET /v1/employer/shift/current                  - Get all shifts where status = published, start_utc>NOW() (embed premises)
* GET /v1/employer/shift/{shift_id}               - Get specific shift (embed premises)
* PATCH /v1/employer/shift/{shift_id}             - Modify/Publish, or Complete and Rate Shift
* DELETE /v1/employer/shift/{shift_id}            - Cancel Shift

## Bids
Scoped to current organisation

* GET /v1/employer/bid                            - Get all bids on all shifts (embed shift)
* GET /v1/employer/shift/{shift_id}/bid           - Get all bids on specific shift (embed shift)
* PATCH /v1/employer/bid/{bid_id}                 - Accept/Reject bid

# Employee

## Account
* GET /v1/employee/account                        - Get account information
* PATCH /v1/employee/account                      - Modify account information

## Shift

* GET /v1/employee/shift                          - Get all shifts assigned to this employee  // NOT IMPLEMENTED
* GET /v1/employee/shift/current                  - Get all shifts assigned to this employee, status = accepted, start_utc>NOW() 
* GET /v1/employee/shift/available?lat=xx&lng=xx&distance=xx  - Get all shifts local, eligible, published, within km of lat/lng
* PATCH /v1/employee/shift/{shift_id}             - Complete and Rate shift for this employee 

## Bids

* POST /v1/employee/bid                           - Create a bid on a shift for this employee 
* GET /v1/employee/bid                            - Get all bids on all shifts for this employee
* GET /v1/employee/bid/current                    - Get all bids on all upcoming shifts for this employee
* GET /v1/employee/bid/{bid_id}                   - Create a bid on a shift for this employee
* DELETE /v1/employee/bid/{bid_id}                - Cancel a bid on a shift for this employee