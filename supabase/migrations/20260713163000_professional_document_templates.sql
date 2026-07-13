-- Upgrade seeded document templates with polished HR letter content.
-- Only default templates are updated; custom templates remain untouched.

UPDATE hrms.document_templates AS dt
SET
  subject = t.subject,
  body_html = t.body_html,
  updated_at = now()
FROM (
  VALUES
    (
      'offer_letter',
      'Offer Letter',
      '<p>Dear {{employeeName}},</p><p>We are pleased to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at {{companyName}}.</p><p>This offer reflects our confidence in your skills, experience, and ability to contribute meaningfully to our growth. Your compensation and employment terms will follow the approved offer details, including {{salary}} where applicable.</p><p>Reporting Manager: {{manager}}<br/>Expected Joining Date: {{joiningDate}}</p><p>We look forward to welcoming you to {{companyName}} and building a successful journey together.</p><p>Warm regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'appointment_letter',
      'Appointment Letter',
      '<p>Dear {{employeeName}},</p><p>Congratulations. We are pleased to appoint you as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at {{companyName}}, effective {{joiningDate}}.</p><p>Employee Code: {{employeeCode}}<br/>Reporting Manager: {{manager}}</p><p>Your appointment is based on the terms communicated by the organization and the policies applicable to your role. We trust you will bring ownership, professionalism, and positive energy to the team.</p><p>Welcome to {{companyName}}. We wish you a rewarding and successful journey with us.</p><p>Warm regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'confirmation_letter',
      'Confirmation Letter',
      '<p>Dear {{employeeName}},</p><p>We are pleased to confirm your employment with {{companyName}} as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p><p>Your performance, conduct, and commitment during the review period have been appreciated. We look forward to your continued contribution and growth within the organization.</p><p>Employee Code: {{employeeCode}}<br/>Reporting Manager: {{manager}}</p><p>Warm regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'promotion_letter',
      'Promotion Letter',
      '<p>Dear {{employeeName}},</p><p>Congratulations. We are delighted to promote you to <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at {{companyName}}.</p><p>This promotion recognizes your consistent performance, ownership, and contribution to the organization. Your revised compensation, where applicable, will be {{salary}} as per the approved structure.</p><p>We are confident that you will continue to lead with accountability and deliver meaningful impact in your new role.</p><p>Warm regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'salary_revision_letter',
      'Salary Revision Letter',
      '<p>Dear {{employeeName}},</p><p>We are pleased to inform you that your compensation has been revised to {{salary}}, in line with the applicable approval process and company policy.</p><p>This revision reflects our appreciation of your contribution as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p><p>We look forward to your continued performance, commitment, and partnership in achieving organizational goals.</p><p>Warm regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'warning_letter',
      'Warning Letter',
      '<p>Dear {{employeeName}},</p><p>This letter is issued as an official warning from {{companyName}} regarding conduct or performance concerns previously communicated to you.</p><p>You are expected to take immediate corrective action, demonstrate measurable improvement, and maintain the standards required for your role as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p><p>Please treat this communication with seriousness. Continued concerns may lead to further action as per company policy.</p><p>Regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'appreciation_letter',
      'Appreciation Letter',
      '<p>Dear {{employeeName}},</p><p>We are pleased to recognize and appreciate your valuable contribution as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p><p>Your commitment, professionalism, and positive impact have been noticed and valued by {{companyName}}. Contributions like yours help strengthen our culture and move the organization forward.</p><p>Thank you for your dedication. We wish you continued success.</p><p>Warm regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'experience_letter',
      'Experience Letter',
      '<p>To whom it may concern,</p><p>This is to certify that {{employeeName}}, Employee Code {{employeeCode}}, has been associated with {{companyName}} as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p><p>During the tenure, {{employeeName}} has contributed to assigned responsibilities and maintained a professional approach to work.</p><p>We thank {{employeeName}} for the service and wish continued success in future endeavors.</p><p>Regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'relieving_letter',
      'Relieving Letter',
      '<p>Dear {{employeeName}},</p><p>This is to confirm that you have been relieved from your duties at {{companyName}} after completing the required exit formalities.</p><p>You served as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department. We appreciate your contribution during your association with the organization.</p><p>We wish you success in your future endeavors.</p><p>Regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'termination_letter',
      'Termination Letter',
      '<p>Dear {{employeeName}},</p><p>This letter confirms the termination of your employment with {{companyName}} in accordance with the applicable company process and communicated terms.</p><p>Your role was <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department. You are required to complete all handover, clearance, and exit formalities with Human Resources.</p><p>Please contact HR for any documentation or settlement-related queries.</p><p>Regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'resignation_acceptance_letter',
      'Acceptance of Resignation',
      '<p>Dear {{employeeName}},</p><p>This is to formally confirm that your resignation from {{companyName}} has been accepted.</p><p>Please complete the required handover, clearance, and exit formalities with your reporting manager, {{manager}}, and the Human Resources team.</p><p>We appreciate your contribution to {{companyName}} and wish you success in your future endeavors.</p><p>Regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    ),
    (
      'settlement_letter',
      'Final Settlement Letter',
      '<p>Dear {{employeeName}},</p><p>This letter confirms that the final settlement process for your employment with {{companyName}} has been initiated as per company policy.</p><p>Employee Code: {{employeeCode}}<br/>Designation: {{designation}}<br/>Department: {{department}}</p><p>Please coordinate with Human Resources for any pending documentation, recoveries, dues, or settlement-related clarifications.</p><p>Regards,<br/>Human Resources<br/>{{companyName}}<br/>{{currentDate}}</p>'
    )
) AS t(letter_type, subject, body_html)
WHERE dt.letter_type = t.letter_type
  AND dt.is_default = true
  AND dt.deleted_at IS NULL;
