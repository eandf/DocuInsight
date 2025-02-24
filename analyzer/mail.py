from typing import Union, List
import resend
import json
import os

resend.api_key = os.getenv("RESEND_API_KEY")


def send_document_review_email(
    sender_name: str,
    sender_email: str,
    recipient_name: str,
    recipient_email: Union[str, List[str]],
    document_link: str,
    document_message: str,
    signature_line: str,
    email_from_name: str,
    from_email_address: str,
    action_description: str = "sent you a document to review and sign",
    button_text: str = "REVIEW DOCUMENT",
):
    """
    Sends an email notification to the recipient(s) for document review using the DocuInsight service.

    Parameters:
    - sender_name (str): The full name of the person sending the email.
    - sender_email (str): The email address of the sender.
    - recipient_name (str): The full name of the intended recipient.
    - recipient_email (Union[str, List[str]]): The email address or a list of email addresses of the recipient(s).
    - document_link (str): URL link to the document that needs to be reviewed.
    - document_message (str): A personalized message to be included in the email body for the recipient.
    - signature_line (str): The sender's name as it should appear in the email's closing signature.
    - action_description (str, optional): A brief description of the action for which the document is sent. Defaults to "sent you a document to review and sign".
    - button_text (str, optional): Text to display on the button linking to the document. Defaults to "REVIEW DOCUMENT".

    Returns:
    - The response from the `resend.Emails.send` function, which indicates the success or failure of the email sending process.

    Example call:
    result = send_document_review_email(
        sender_name="Mehmet Yilmaz",
        sender_email="hello@gmail.com",
        recipient_name="Dylan Ack",
        recipient_email=["gamer@gmail.com", "hello@gmail.com"],
        document_link="https://notifycyber.com/",
        document_message="Please review and sign the NDA agreement using DocuInsight.",
        signature_line="Mehmet Yilmaz",
        email_from_name="DocuInsight",
        from_email_address="noreply@docuinsight.ai",
        action_description="sent you a document to review and sign",
        button_text="REVIEW DOCUMENT",
    )
    """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
            <tr>
                <td align="center" style="padding: 20px;">
                    <!-- Title -->
                    <div style="font-size: 32px; color: #260559; font-weight: bold; margin-bottom: 20px;">
                        DocuInsight
                    </div>
                    
                    <!-- Purple Section -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #260559; color: white; padding: 40px; margin-bottom: 30px;">
                        <tr>
                            <td align="center">
                                <!-- Circle with Document Icon -->
                                <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px;">
                                    <tr>
                                        <td style="width: 64px; height: 64px; border: 2px solid white; border-radius: 32px; text-align: center; vertical-align: middle;">
                                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                                <tr>
                                                    <td style="width: 28px; height: 36px; background-color: white; vertical-align: middle;">
                                                        <!-- Document lines using table rows -->
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr><td height="6"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Message -->
                                <div style="font-size: 20px; margin-bottom: 20px;">
                                    {sender_name} {action_description}.
                                </div>
                                
                                <!-- Button -->
                                <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                    <tr>
                                        <td style="background-color: #735AFF; border-radius: 4px;">
                                            <a href="{document_link}" style="display: inline-block; padding: 12px 24px; color: white; text-decoration: none; font-weight: bold; letter-spacing: 0.5px;">
                                                {button_text}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Sender Info -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                        <tr>
                            <td>
                                <div style="font-size: 16px; font-weight: 500;">{sender_name}</div>
                                <div style="font-size: 16px;"><a href="mailto:{sender_email}" style="color: #1B5CCE; text-decoration: none;">{sender_email}</a></div>
                            </td>
                        </tr>
                    </table>

                    <!-- Message Content -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 16px;">
                        <tr>
                            <td style="padding-bottom: 24px;">Hello {recipient_name},</td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 24px;">{document_message}</td>
                        </tr>
                        <tr>
                            <td>
                                Thank you!<br>
                                {signature_line}
                            </td>
                        </tr>
                    </table>

                    <!-- Footer -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                        <tr>
                            <td style="color: #666; font-size: 14px;">
                                <h3 style="margin: 0 0 8px 0; font-size: 14px;">Do Not Share This Email</h3>
                                <p style="margin: 0 0 20px 0;">This email contains a secure link to DocuInsight. Please do not share this email or link with others.</p>
                                
                                <h3 style="margin: 0 0 8px 0; font-size: 14px;">About DocuInsight</h3>
                                <p style="margin: 0;">Sign and understand documents intelligently in just minutes. DocuInsight simplifies complex legal contracts, making them accessible to everyone through AI-powered explanations and plain English translations. Whether you're at the office, at home, or on-the-go, DocuInsight provides a trusted solution for document understanding and digital transaction management.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    to_emails = [recipient_email]
    if type(recipient_email) == list:
        to_emails = recipient_email

    params: resend.Emails.SendParams = {
        "from": f"{email_from_name} <{from_email_address}>",
        "to": to_emails,
        "subject": f"{sender_name} {action_description}",
        "html": html_content,
    }

    email = resend.Emails.send(params)
    return email


def send_personal_doc_analysis_email(
    user_name: str,
    user_email: str,
    document_link: str,
    email_from_name: str,
    from_email_address: str,
    document_message: str = "Your document has been analyzed. You can review or interact with it now!",
    analysis_headline_text: str = "Your document has been analyzed!",
    button_text: str = "VIEW YOUR DOCUMENT",
    signature_line: str = "DocuInsight Team",
    full_custom_override_subject_text: str = None,
):
    """
    Sends an email to a user after they upload their own document for analysis.

    Parameters:
    - user_name (str): The name of the user who uploaded the document.
    - user_email (str): The email address of the user.
    - document_link (str): The URL that the user can click to view the analyzed document.
    - email_from_name (str): The "name" portion of the email's "From" header (e.g., "DocuInsight").
    - from_email_address (str): The actual email address sending this email (e.g., "noreply@docuinsight.ai").
    - document_message (str, optional): A personalized message to be included in the email body.
      Defaults to "Your document has been analyzed. You can review or interact with it now!".
    - analysis_headline_text (str, optional): The main headline text in the purple section.
      Defaults to "Your document has been analyzed!".
    - button_text (str, optional): The text shown on the action button. Defaults to "VIEW YOUR DOCUMENT".
    - signature_line (str, optional): How you'd like the sender's signature area to read.
      Defaults to "DocuInsight Team".
    - full_custom_override_subject_text (str, optional): Allows you to override the subject line completely.
      If None, the default subject is "Your document analysis is ready!".

    Returns:
    - The response from the `resend.Emails.send` function, indicating success or failure.
    """

    # if no custom subject is provided, use a default subject
    final_subject = full_custom_override_subject_text
    if full_custom_override_subject_text is None:
        final_subject = "Your document analysis is ready!"

    # html content (same layout design as your original code)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
            <tr>
                <td align="center" style="padding: 20px;">
                    
                    <!-- Title -->
                    <div style="font-size: 32px; color: #260559; font-weight: bold; margin-bottom: 20px;">
                        DocuInsight
                    </div>
                    
                    <!-- Purple Section -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #260559; color: white; padding: 40px; margin-bottom: 30px;">
                        <tr>
                            <td align="center">
                                
                                <!-- Circle with Document Icon -->
                                <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px;">
                                    <tr>
                                        <td style="width: 64px; height: 64px; border: 2px solid white; border-radius: 32px; text-align: center; vertical-align: middle;">
                                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                                <tr>
                                                    <td style="width: 28px; height: 36px; background-color: white; vertical-align: middle;">
                                                        <!-- Document lines using table rows -->
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr><td height="6"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Headline Text -->
                                <div style="font-size: 20px; margin-bottom: 20px;">
                                    {analysis_headline_text}
                                </div>
                                
                                <!-- Button -->
                                <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                    <tr>
                                        <td style="background-color: #735AFF; border-radius: 4px;">
                                            <a href="{document_link}" style="display: inline-block; padding: 12px 24px; color: white; text-decoration: none; font-weight: bold; letter-spacing: 0.5px;">
                                                {button_text}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                            </td>
                        </tr>
                    </table>

                    <!-- Message Content -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 16px;">
                        <tr>
                            <td style="padding-bottom: 24px;">
                                Hello {user_name},
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 24px;">
                                {document_message}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Thank you!<br>
                                {signature_line}
                            </td>
                        </tr>
                    </table>

                    <!-- Footer -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                        <tr>
                            <td style="color: #666; font-size: 14px;">
                                <h3 style="margin: 0 0 8px 0; font-size: 14px;">Do Not Share This Email</h3>
                                <p style="margin: 0 0 20px 0;">
                                    This email contains a secure link to DocuInsight. Please do not share this email or link with others.
                                </p>
                                
                                <h3 style="margin: 0 0 8px 0; font-size: 14px;">About DocuInsight</h3>
                                <p style="margin: 0;">
                                    Sign and understand documents intelligently in just minutes. DocuInsight simplifies complex legal contracts,
                                    making them accessible to everyone through AI-powered explanations and plain English translations. 
                                    Whether you're at the office, at home, or on-the-go, DocuInsight provides a trusted solution for 
                                    document understanding and digital transaction management.
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    # ensure 'to' is a list even if a single email is provided
    to_emails = [user_email] if isinstance(user_email, str) else user_email

    params: resend.Emails.SendParams = {
        "from": f"{email_from_name} <{from_email_address}>",
        "to": to_emails,
        "subject": final_subject,
        "html": html_content,
    }

    email_response = resend.Emails.send(params)

    return email_response


if __name__ == "__main__":
    demo_email_link = "https://www.docuinsight.ai/sign?job=a070d50e-11dd-4bdc-b679-4182e7a303f4&invite=aa949bb8-11f0-4c66-a506-8d3946000432"
    recipient_email = input("Please enter the recipient email: ")

    analysis_result = send_personal_doc_analysis_email(
        user_name="Mehmet Yilmaz",
        user_email=recipient_email,
        document_link=demo_email_link,
        email_from_name="DocuInsight",
        from_email_address="noreply@docuinsight.ai",
        document_message="We've successfully analyzed your uploaded document. Click below to view the results!",
        analysis_headline_text="Your Document Analysis is Ready!",
        button_text="VIEW ANALYSIS",
        signature_line="The DocuInsight Team",
        full_custom_override_subject_text="Your Document Analysis Results Are Here!",
    )

    review_result = send_document_review_email(
        sender_name="Mehmet Hanifi Yilmaz",
        sender_email="mehmet@efgroupinc.com",
        recipient_name="Mehmet Yilmaz",
        recipient_email=recipient_email,
        document_link=demo_email_link,
        document_message="Please review the document using DocuInsight. Your action is required.",
        signature_line="Mehmet Hanifi Yilmaz",
        email_from_name="DocuInsight",
        from_email_address="noreply@docuinsight.ai",
        action_description="sent you a document to review and sign",
        button_text="REVIEW DOCUMENT",
    )

    print("\n=== Personal Document Analysis Email Response ===")
    print(json.dumps(analysis_result, indent=4))
    print("\n=== Document Review Email Response ===")
    print(json.dumps(review_result, indent=4))
