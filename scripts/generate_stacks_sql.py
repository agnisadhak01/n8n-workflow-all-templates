import re
from textwrap import dedent

raw = dedent("""
Google Sheets
Google Sheets - integration
OpenAI
OpenAI - integration
Telegram
Telegram - integration
Gmail
Gmail - integration
MySQL
MySQL - integration
Postgres
Postgres - integration
Discord
Discord - integration
Google Drive
Google Drive - integration
Slack
Slack - integration
Notion
Notion - integration
Microsoft Outlook
Microsoft Outlook - integration
Microsoft Excel 365
Microsoft Excel 365 - integration
Google Calendar
Google Calendar - integration
1Shot API
1Shot API - integration
2Chat
2Chat - integration
Abyssale
Abyssale - integration
Action Network
Action Network - integration
ActiveCampaign
ActiveCampaign - integration
Acuity Scheduling
Acuity Scheduling - integration
Ada
Ada - integration
Adalo
Adalo - integration
Add To Wallet
Add To Wallet - integration
Affinity
Affinity - integration
Agencii
Agencii - integration
Agile CRM
Agile CRM - integration
AI Agent
AI Agent Tool
AI Scraper
AI Scraper - integration
AI/ML API
AI/ML API - integration
Aimfox
Aimfox - integration
Air
Air - integration
AIR
AIR - integration
Airparser
Airparser - integration
Airtable
Airtable - integration
Airtop
Airtop - integration
Alive5
Alive5 - integration
AMQP
AMQP - integration
AMQP Sender
AMQP Sender - integration
Anchor Browser
Anchor Browser - integration
Anny
Anny - integration
Anthropic
Anthropic - integration
Anthropic Chat Model
Anthropic Chat Model - integration
Apaleo Official
Apaleo Official - integration
Apex
Apex - integration
Apify
Apify - integration
APITemplate.io
APITemplate.io - integration
Asana
Asana - integration
AssemblyAI
AssemblyAI - integration
Atriomail
Atriomail - integration
Authentica
Authentica - integration
Auto-fixing Output Parser
Autobound
Autobound - integration
Autocalls
Autocalls - integration
Automizy
Automizy - integration
Autopilot
Autopilot - integration
AvatarTalk
AvatarTalk - integration
awork
awork - integration
AWS Bedrock Chat Model
AWS Bedrock Chat Model - integration
AWS Certificate Manager
AWS Certificate Manager - integration
AWS Cognito
AWS Cognito - integration
AWS Comprehend
AWS Comprehend - integration
AWS DynamoDB
AWS DynamoDB - integration
AWS ELB
AWS ELB - integration
AWS IAM
AWS IAM - integration
AWS Lambda
AWS Lambda - integration
AWS Rekognition
AWS Rekognition - integration
AWS S3
AWS S3 - integration
AWS SES
AWS SES - integration
AWS SNS
AWS SNS - integration
AWS SQS
AWS SQS - integration
AWS Textract
AWS Textract - integration
AWS Transcribe
AWS Transcribe - integration
Azure AI Search Vector Store
Azure AI Search Vector Store - integration
Azure Cosmos DB
Azure Cosmos DB - integration
Azure OpenAI Chat Model
Azure OpenAI Chat Model - integration
Azure Storage
Azure Storage - integration
BambooHR
BambooHR - integration
Bannerbear
Bannerbear - integration
Basalt
Basalt - integration
Baserow
Baserow - integration
Basic LLM Chain
Bedrijfsdata
Bedrijfsdata - integration
Beeminder
Beeminder - integration
Belake.ai
Belake.ai - integration
Beyond Presence
Beyond Presence - integration
Bitbucket
Bitbucket - integration
Bitly
Bitly - integration
Bitwarden
Bitwarden - integration
Blooio Messaging
Blooio Messaging - integration
Blotato
Blotato - integration
Blue
Blue - integration
bookoly
bookoly - integration
Botnoi Voice
Botnoi Voice - integration
BounceBan
BounceBan - integration
Box
Box - integration
Brandfetch
Brandfetch - integration
Brave Search
Brave Search - integration
Brevo
Brevo - integration
BrightData
BrightData - integration
BrowserAct
BrowserAct - integration
Browserflow for LinkedIn
Browserflow for LinkedIn - integration
Bubble
Bubble - integration
Businessmap
Businessmap - integration
Cal.com
Cal.com - integration
Calculator
Calendly
Calendly - integration
Call n8n Workflow Tool
Camino AI
Camino AI - integration
Carbone
Carbone - integration
Caspio
Caspio - integration
Chainstream
Chainstream - integration
Character Text Splitter
Chargebee
Chargebee - integration
ChartMogul
ChartMogul - integration
Chat Data
Chat Data - integration
Chat Memory Manager
Chroma Vector Store
Chroma Vector Store - integration
CircleCI
CircleCI - integration
Clearbit
Clearbit - integration
ClickUp
ClickUp - integration
Clipboard Genie
Clipboard Genie - integration
Clockify
Clockify - integration
CloudConvert
CloudConvert - integration
Cloudflare
Cloudflare - integration
Cloudinary
Cloudinary - integration
CMD
CMD - integration
Cockpit
Cockpit - integration
Coda
Coda - integration
Code Tool
Cohere Chat Model
Cohere Chat Model - integration
Cohere Model
Cohere Model - integration
CoinGecko
CoinGecko - integration
CometAPI
CometAPI - integration
Contentdrips
Contentdrips - integration
Contentful
Contentful - integration
Contextual AI
Contextual AI - integration
Contextual Compression Retriever
ConvertKit
ConvertKit - integration
Copicake
Copicake - integration
Copper
Copper - integration
Cortex
Cortex - integration
CraftMyPdf
CraftMyPdf - integration
CrateDB
CrateDB - integration
Cronlytic
Cronlytic - integration
Crossmint Wallets
Crossmint Wallets - integration
crowd.dev
crowd.dev - integration
CSVBox
CSVBox - integration
Currents
Currents - integration
Customer Datastore (n8n training)
Customer Datastore (n8n training) - integration
Customer Messenger (n8n training)
Customer Messenger (n8n training) - integration
Customer.io
Customer.io - integration
Dalil AI
Dalil AI - integration
Dart
Dart - integration
DebugHelper
DebugHelper - integration
DecisionRules
DecisionRules - integration
Decodo
Decodo - integration
DeepL
DeepL - integration
DeepSeek Chat Model
DeepSeek Chat Model - integration
DeepTagger
DeepTagger - integration
Default Data Loader
Default Data Loader - integration
Deliverect
Deliverect - integration
Demio
Demio - integration
DeutschlandGPT
DeutschlandGPT - integration
DHL
DHL - integration
DigitalOcean Gradient™ AI Serverless Inference
DigitalOcean Gradient™ AI Serverless Inference - integration
Directus
Directus - integration
Discourse
Discourse - integration
Disqus
Disqus - integration
DiviUp Connect
DiviUp Connect - integration
DocsAutomator
DocsAutomator - integration
DocuGenerate
DocuGenerate - integration
Documentero
Documentero - integration
docunite® NEO
docunite® NEO - integration
DocuProx
DocuProx - integration
DocuSeal
DocuSeal - integration
Docutray
Docutray - integration
DocuWriter.ai
DocuWriter.ai - integration
Drift
Drift - integration
Droidrun Tasks
Droidrun Tasks - integration
Dropbox
Dropbox - integration
Dropcontact
Dropcontact - integration
Dumpling AI
Dumpling AI - integration
Dust
Dust - integration
E-goi
E-goi - integration
Easy Redmine
Easy Redmine - integration
eKyte
eKyte - integration
Elastic Security
Elastic Security - integration
Elasticsearch
Elasticsearch - integration
ElevenLabs
ElevenLabs - integration
EmailValidation
EmailValidation - integration
Embeddings AWS Bedrock
Embeddings AWS Bedrock - integration
Embeddings Azure OpenAI
Embeddings Azure OpenAI - integration
Embeddings Cohere
Embeddings Cohere - integration
Embeddings Google Gemini
Embeddings Google Gemini - integration
Embeddings Google PaLM
Embeddings Google PaLM - integration
Embeddings Google Vertex
Embeddings Google Vertex - integration
Embeddings Hugging Face Inference
Embeddings Hugging Face Inference - integration
Embeddings Lemonade
Embeddings Lemonade - integration
Embeddings Mistral Cloud
Embeddings Mistral Cloud - integration
Embeddings Ollama
Embeddings Ollama - integration
Embeddings OpenAI
Embeddings OpenAI - integration
Emelia
Emelia - integration
Enginemailer
Enginemailer - integration
ERPNext
ERPNext - integration
Evaluation
Eventbrite
Eventbrite - integration
Exa
Exa - integration
Explorium API
Explorium API - integration
Extruct AI
Extruct AI - integration
Facebook
Facebook - integration
Facebook Graph API
Facebook Graph API - integration
Facebook Lead Ads
Facebook Lead Ads - integration
Famulor
Famulor - integration
Featherless
Featherless - integration
Fibery
Fibery - integration
Figma (Beta)
Figma  (Beta) - integration
FileMaker
FileMaker - integration
Fillout
Fillout - integration
Firecrawl
Firecrawl - integration
Fireflies
Fireflies - integration
Flarelight
Flarelight - integration
Flow
Flow - integration
FluentC Translate
FluentC Translate - integration
Form.io
Form.io - integration
Formstack
Formstack - integration
Freshdesk
Freshdesk - integration
Freshservice
Freshservice - integration
Freshworks CRM
Freshworks CRM - integration
FullEnrich
FullEnrich - integration
Gainium
Gainium - integration
Gatus
Gatus - integration
geoCapture
geoCapture - integration
GetResponse
GetResponse - integration
GetTranscribe
GetTranscribe - integration
Ghost
Ghost - integration
Github
Github - integration
GitHub
GitHub - integration
GitHub Document Loader
GitHub Document Loader - integration
GitLab
GitLab - integration
Glean
Glean - integration
Globalping
Globalping - integration
Gong
Gong - integration
Google Ads
Google Ads - integration
Google Analytics
Google Analytics - integration
Google BigQuery
Google BigQuery - integration
Google Books
Google Books - integration
Google Business Profile
Google Business Profile - integration
Google Chat
Google Chat - integration
Google Cloud Firestore
Google Cloud Firestore - integration
Google Cloud Natural Language
Google Cloud Natural Language - integration
Google Cloud Realtime Database
Google Cloud Realtime Database - integration
Google Cloud Storage
Google Cloud Storage - integration
Google Contacts
Google Contacts - integration
Google Docs
Google Docs - integration
Google Gemini
Google Gemini - integration
Google Gemini Chat Model
Google Gemini Chat Model - integration
Google PaLM Chat Model
Google PaLM Chat Model - integration
Google PaLM Language Model
Google PaLM Language Model - integration
Google Perspective
Google Perspective - integration
Google Slides
Google Slides - integration
Google Tasks
Google Tasks - integration
Google Translate
Google Translate - integration
Google Vertex Chat Model
Google Vertex Chat Model - integration
Google Workspace Admin
Google Workspace Admin - integration
Gotify
Gotify - integration
gotoHuman
gotoHuman - integration
GoToWebinar
GoToWebinar - integration
Grafana
Grafana - integration
GraphQL
GraphQL - integration
Greip
Greip - integration
Grist
Grist - integration
Groner
Groner - integration
Groq Chat Model
Groq Chat Model - integration
Guardrails
Guardrails - integration
Gumroad
Gumroad - integration
Gyazo
Gyazo - integration
Hacker News
Hacker News - integration
HaloPSA
HaloPSA - integration
handelsregister.ai
handelsregister.ai - integration
Harvest
Harvest - integration
Hedy
Hedy - integration
Help Scout
Help Scout - integration
HeyReach API
HeyReach API - integration
HighLevel
HighLevel - integration
HITL Platform
HITL Platform - integration
Home Assistant
Home Assistant - integration
Hostinger API
Hostinger API - integration
HTML to PDF
HTML to PDF - integration
HTML/CSS to Image
HTML/CSS to Image - integration
Hubbi
Hubbi - integration
HubSpot
HubSpot - integration
Hugging Face Inference Model
Hugging Face Inference Model - integration
Humantic AI
Humantic AI - integration
Hunter
Hunter - integration
InboxPlus
InboxPlus - integration
InfobipApi
InfobipApi - integration
Information Extractor
InfraNodus Graph RAG
InfraNodus Graph RAG - integration
Inoreader
Inoreader - integration
Instantly
Instantly - integration
Intercom
Intercom - integration
Invoice Ninja
Invoice Ninja - integration
IPGeolocation
IPGeolocation - integration
Item List Output Parser
Iterable
Iterable - integration
iTop
iTop - integration
JaaS AI
JaaS AI - integration
Jenkins
Jenkins - integration
JetAPI
JetAPI - integration
JigsawStack
JigsawStack - integration
Jina AI
Jina AI - integration
Jira
Jira - integration
Jira Software
Jira Software - integration
JoAi
JoAi - integration
JoggAI
JoggAI - integration
Jotform
Jotform - integration
JSONPost
JSONPost - integration
JWT
JWT - integration
Kafka
Kafka - integration
Keap
Keap - integration
Kipps.AI Chatbot
Kipps.AI Chatbot - integration
Kitemaker
Kitemaker - integration
Klardaten DATEVconnect: Master Data
Klardaten DATEVconnect: Master Data - integration
KlickTipp
KlickTipp - integration
KoBoToolbox
KoBoToolbox - integration
KrispCall
KrispCall - integration
Kylas
Kylas - integration
LangChain Code
Langfuse
Langfuse - integration
LATE
LATE - integration
Ldap
Ldap - integration
LEDGERS
LEDGERS - integration
Lemlist
Lemlist - integration
Lemonade Chat Model
Lemonade Chat Model - integration
Lemonade Model
Lemonade Model - integration
Level
Level - integration
Line
Line - integration
Linear
Linear - integration
LingvaNex
LingvaNex - integration
Linked API
Linked API - integration
LinkedIn
LinkedIn - integration
Linkup API for LinkedIn
Linkup API for LinkedIn - integration
LLMLayer
LLMLayer - integration
LLMWhisperer
LLMWhisperer - integration
Lnk.Bio
Lnk.Bio - integration
Local Falcon
Local Falcon - integration
LoneScale
LoneScale - integration
Lusha
Lusha - integration
Magento 2
Magento 2 - integration
Magnetite
Magnetite - integration
Mailcheck
Mailcheck - integration
Mailchimp
Mailchimp - integration
MailerLite
MailerLite - integration
Mailgun
Mailgun - integration
Mailjet
Mailjet - integration
Mailtrap
Mailtrap - integration
Mallabe Barcodes
Mallabe Barcodes - integration
Mallabe Images
Mallabe Images - integration
Mandrill
Mandrill - integration
Marketstack
Marketstack - integration
Markup AI
Markup AI - integration
Matrix
Matrix - integration
Mattermost
Mattermost - integration
Mautic
Mautic - integration
MCP Client
MCP Client - integration
MCP Client Tool
MCP Client Tool - integration
Medium
Medium - integration
Medullar
Medullar - integration
MeetGeek
MeetGeek - integration
Memara
Memara - integration
MessageBird
MessageBird - integration
Metabase
Metabase - integration
mfr - Field Service Management
mfr - Field Service Management - integration
Microsoft Dynamics CRM
Microsoft Dynamics CRM - integration
Microsoft Entra ID
Microsoft Entra ID - integration
Microsoft Graph Security
Microsoft Graph Security - integration
Microsoft OneDrive
Microsoft OneDrive - integration
Microsoft SharePoint
Microsoft SharePoint - integration
Microsoft SQL
Microsoft SQL - integration
Microsoft Teams
Microsoft Teams - integration
Microsoft To Do
Microsoft To Do - integration
Milvus Vector Store
Milvus Vector Store - integration
Mindee
Mindee - integration
MISP
MISP - integration
Mistral AI
Mistral AI - integration
Mistral Cloud Chat Model
Mistral Cloud Chat Model - integration
Mocean
Mocean - integration
Model Selector
Monday.com
Monday.com - integration
MongoDB
MongoDB - integration
MongoDB Atlas Vector Store
MongoDB Atlas Vector Store - integration
MongoDB Chat Memory
MongoDB Chat Memory - integration
Monica CRM
Monica CRM - integration
Moorcheh
Moorcheh - integration
Motorhead
MQTT
MQTT - integration
MrScraper
MrScraper - integration
MSG91
MSG91 - integration
MultiQuery Retriever
Murf AI
Murf AI - integration
Musixmatch
Musixmatch - integration
Nalpeiron Zentitle2
Nalpeiron Zentitle2 - integration
NASA
NASA - integration
Nedzo
Nedzo - integration
nele.ai
nele.ai - integration
Netgsm
Netgsm - integration
Netlify
Netlify - integration
Netscaler ADC
Netscaler ADC - integration
Nexlev
Nexlev - integration
Nexrender
Nexrender - integration
Nextcloud
Nextcloud - integration
Nimba SMS
Nimba SMS - integration
NocoDB
NocoDB - integration
Npm
Npm - integration
Nuelink
Nuelink - integration
Nvoip
Nvoip - integration
Octagon
Octagon - integration
Octave
Octave - integration
Odoo
Odoo - integration
Okta
Okta - integration
Ollama
Ollama - integration
Ollama Chat Model
Ollama Chat Model - integration
Ollama Model
Ollama Model - integration
Olostep Web Scraper
Olostep Web Scraper - integration
Omnara
Omnara - integration
One Simple API
One Simple API - integration
Onfleet
Onfleet - integration
OnlyFans API
OnlyFans API - integration
OpenAI Chat Model
OpenAI Chat Model - integration
OpenRegister
OpenRegister - integration
OpenRouter Chat Model
OpenRouter Chat Model - integration
OpenThesaurus
OpenThesaurus - integration
OpenWeatherMap
OpenWeatherMap - integration
OpnForm
OpnForm - integration
Oracle Database
Oracle Database - integration
Orbit
Orbit - integration
Orgo
Orgo - integration
Orq Deployment
Orq Deployment - integration
Orshot
Orshot - integration
Oura
Oura - integration
Outgrow
Outgrow - integration
Outscraper
Outscraper - integration
Oxylabs AI Studio
Oxylabs AI Studio - integration
Paddle
Paddle - integration
PagBank
PagBank - integration
PagerDuty
PagerDuty - integration
Parallel
Parallel - integration
Parseur
Parseur - integration
Parsio
Parsio - integration
Payfunnels
Payfunnels - integration
PayPal
PayPal - integration
PDF Generator API
PDF Generator API - integration
PDF Vector
PDF Vector - integration
PDF.co Api
PDF.co Api - integration
PDF4ME
PDF4ME - integration
PDFMonkey
PDFMonkey - integration
Pdforge
Pdforge - integration
Peek Pro
Peek Pro - integration
Peekalink
Peekalink - integration
Peliqan
Peliqan - integration
Perigon
Perigon - integration
Permit
Permit - integration
Perplexity
Perplexity - integration
Phacet
Phacet - integration
Phantombuster
Phantombuster - integration
Philips Hue
Philips Hue - integration
Picsart
Picsart - integration
Pinecone Assistant
Pinecone Assistant - integration
Pinecone Vector Store
Pinecone Vector Store - integration
Pipedrive
Pipedrive - integration
Placid
Placid - integration
Plivo
Plivo - integration
Port API AI
Port API AI - integration
PostBin
PostBin - integration
Postgres Chat Memory
Postgres Chat Memory - integration
Postgres PGVector Store
Postgres PGVector Store - integration
PostHog
PostHog - integration
Postiz
Postiz - integration
Postmark
Postmark - integration
PostNitro
PostNitro - integration
PostPulse
PostPulse - integration
PredictLeads
PredictLeads - integration
Presenton
Presenton - integration
Prisma AIRS
Prisma AIRS - integration
ProfitWell
ProfitWell - integration
PromptLayer Run Agent
PromptLayer Run Agent - integration
ProspectPro
ProspectPro - integration
PubNub
PubNub - integration
Pushbullet
Pushbullet - integration
Pushcut
Pushcut - integration
Pushinator
Pushinator - integration
Pushover
Pushover - integration
Qdrant
Qdrant - integration
Qdrant Vector Store
Qdrant Vector Store - integration
QuestDB
QuestDB - integration
Question and Answer Chain
Quick Base
Quick Base - integration
QuickBooks Online
QuickBooks Online - integration
QuickChart
QuickChart - integration
Quire
Quire - integration
RabbitMQ
RabbitMQ - integration
raia
raia - integration
Raindrop
Raindrop - integration
Razorpay
Razorpay - integration
Reachkit
Reachkit - integration
Recursive Character Text Splitter
Reddit
Reddit - integration
Redis
Redis - integration
Redis Chat Memory
Redis Chat Memory - integration
Redis Vector Store
Redis Vector Store - integration
Referral Factory
Referral Factory - integration
Reportei
Reportei - integration
Reranker Cohere
Reranker Cohere - integration
Respond.io
Respond.io - integration
Roam
Roam - integration
RocketChat
RocketChat - integration
RogerRoger
RogerRoger - integration
Rundeck
Rundeck - integration
Rye
Rye - integration
S3
S3 - integration
Salesforce
Salesforce - integration
Salesmate
Salesmate - integration
Scrape Creators
Scrape Creators - integration
ScrapegraphAI
ScrapegraphAI - integration
Scrapeless Official
Scrapeless Official - integration
ScrapeOps
ScrapeOps - integration
Scrapfly
Scrapfly - integration
ScrapingBee
ScrapingBee - integration
ScrapingDog
ScrapingDog - integration
Scrappey
Scrappey - integration
ScreenshotBase
ScreenshotBase - integration
Screenshots by Urlbox
Screenshots by Urlbox - integration
SE Ranking
SE Ranking - integration
SearchApi
SearchApi - integration
SearXNG
SearXNG - integration
SeaTable
SeaTable - integration
Seclore
Seclore - integration
SecureVector
SecureVector - integration
SecurityScorecard
SecurityScorecard - integration
Segment
Segment - integration
SendGrid
SendGrid - integration
Sendon
Sendon - integration
SendPulse Automation360
SendPulse Automation360 - integration
Sendy
Sendy - integration
Sentiment Analysis
Sentry.io
Sentry.io - integration
SEO Content Machine
SEO Content Machine - integration
SerpApi Official
SerpApi Official - integration
SERPHouse
SERPHouse - integration
ServiceM8
ServiceM8 - integration
ServiceNow
ServiceNow - integration
seven
seven - integration
Shopify
Shopify - integration
Shopware
Shopware - integration
SignifyCRM
SignifyCRM - integration
SIGNL4
SIGNL4 - integration
Simla
Simla - integration
Simple Memory
Simple Vector Store
Simplesat
Simplesat - integration
Simplified
Simplified - integration
SinergiaCRM
SinergiaCRM - integration
Skyvern
Skyvern - integration
SmartSearch
SmartSearch - integration
Snowflake
Snowflake - integration
SOCRadar
SOCRadar - integration
Softr
Softr - integration
Solapi
Solapi - integration
SourceGeek for LinkedIn
SourceGeek for LinkedIn - integration
Splunk
Splunk - integration
Spontit
Spontit - integration
Spotify
Spotify - integration
Stackby
Stackby - integration
Starfish (CampingCare/HotelCare)
Starfish (CampingCare/HotelCare) - integration
Starhunter
Starhunter - integration
Storyblok
Storyblok - integration
Straico Official
Straico Official - integration
Straker Verify
Straker Verify - integration
Strapi
Strapi - integration
Strava
Strava - integration
Stripe
Stripe - integration
Structured Output Parser
Summarization Chain
Supabase
Supabase - integration
Supabase Vector Store
Supabase Vector Store - integration
Supadata
Supadata - integration
Superchat
Superchat - integration
SurveyMonkey
SurveyMonkey - integration
Swiftgum
Swiftgum - integration
SyncroMSP
SyncroMSP - integration
Taiga
Taiga - integration
Tally
Tally - integration
Tapfiliate
Tapfiliate - integration
Tavily
Tavily - integration
Taximail
Taximail - integration
Tazzo.ai
Tazzo.ai - integration
Tela
Tela - integration
telli
telli - integration
Telnyx AI
Telnyx AI - integration
Templated
Templated - integration
Text Classifier
TheHive
TheHive - integration
TheHive 5
TheHive 5 - integration
Think Tool
TimescaleDB
TimescaleDB - integration
Todoist
Todoist - integration
Toggl
Toggl - integration
Token Splitter
Tomba
Tomba - integration
TravisCI
TravisCI - integration
Trello
Trello - integration
TubeLab
TubeLab - integration
Twake
Twake - integration
Twilio
Twilio - integration
Twist
Twist - integration
TwitterShots
TwitterShots - integration
Typecast
Typecast - integration
Typeform
Typeform - integration
Understand Tech Chat
Understand Tech Chat - integration
Unleashed Software
Unleashed Software - integration
upcell API
upcell API - integration
Uplead
Uplead - integration
Upload Post
Upload Post - integration
uProc
uProc - integration
UptimeRobot
UptimeRobot - integration
urlscan.io
urlscan.io - integration
Vector Store Question Answer Tool
Vector Store Retriever
VEED AI Video API
VEED AI Video API - integration
Velatir
Velatir - integration
Venafi TLS Protect Cloud
Venafi TLS Protect Cloud - integration
Venafi TLS Protect Datacenter
Venafi TLS Protect Datacenter - integration
Vercel AI Gateway Chat Model
Vercel AI Gateway Chat Model - integration
Verifi Email
Verifi Email - integration
Vero
Vero - integration
VideoDB
VideoDB - integration
Vikunja
Vikunja - integration
Visualping
Visualping - integration
VLM Run
VLM Run - integration
Vonage
Vonage - integration
Weaviate Vector Store
Weaviate Vector Store - integration
Webex by Cisco
Webex by Cisco - integration
Webflow
Webflow - integration
Webmetic
Webmetic - integration
Wekan
Wekan - integration
WhatsAble
WhatsAble - integration
WhatsApp
WhatsApp - integration
WhatsApp Business Cloud
WhatsApp Business Cloud - integration
WhatsApp Notifications by SyncMate
WhatsApp Notifications by SyncMate - integration
Wikipedia
Wikipedia - integration
Winston AI
Winston AI - integration
Wise
Wise - integration
Wix
Wix - integration
Wiza
Wiza - integration
Wolfram|Alpha
Wolfram|Alpha - integration
WooCommerce
WooCommerce - integration
Wordpress
Wordpress - integration
Workable
Workable - integration
Workflow Retriever
WOZTELL
WOZTELL - integration
WPForms
WPForms - integration
Wufoo
Wufoo - integration
X (Formerly Twitter)
X (Formerly Twitter) - integration
xAI Grok Chat Model
xAI Grok Chat Model - integration
Xano
Xano - integration
Xata
Xata - integration
Xero
Xero - integration
YepCode
YepCode - integration
Yourls
Yourls - integration
YouTube
YouTube - integration
Zammad
Zammad - integration
Zendesk
Zendesk - integration
Zep
Zep - integration
Zep Vector Store
Zep Vector Store - integration
ZeroBounce
ZeroBounce - integration
Zigpoll
Zigpoll - integration
Zoho Calendar
Zoho Calendar - integration
Zoho CRM
Zoho CRM - integration
Zoho TeamInbox
Zoho TeamInbox - integration
Zoho Zeptomail
Zoho Zeptomail - integration
Zoom
Zoom - integration
Zulip
Zulip - integration
""").strip().splitlines()

def make_slug(label: str) -> str:
    # lower, replace non-alnum with -, collapse dashes, strip
    slug = re.sub(r'[^0-9a-zA-Z]+', '-', label)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug.lower()

pairs = []
seen = set()
for line in raw:
    label = line.strip()
    if not label:
        continue
    slug = make_slug(label)
    # avoid exact duplicate (slug,label) rows in this script
    key = (slug, label)
    if key in seen:
        continue
    seen.add(key)
    pairs.append((slug, label))

print("INSERT INTO public.stacks (slug, label)")
print("VALUES")
for i, (slug, label) in enumerate(pairs):
    comma = "," if i < len(pairs) - 1 else ""
    # simple escaping for single quotes in label
    safe_label = label.replace("'", "''")
    print(f"  ('{slug}', '{safe_label}'){comma}")
print("ON CONFLICT (slug) DO NOTHING;")