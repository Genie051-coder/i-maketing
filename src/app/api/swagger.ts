import swaggerJsdoc from 'swagger-jsdoc'
import path from 'path'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My AI Flow API',
      version: '1.0.0',
      description: 'AI 마케팅 플로우 REST API 문서',
    },
    tags: [
      { name: 'Flow', description: '플로우 CRUD' },
      { name: 'Email', description: '이메일 발송 및 AI 작성 에이전트' },
      { name: 'Facebook', description: 'Facebook 게시물 발행 및 AI 에이전트' },
      { name: 'Auth', description: '회원가입 및 OAuth 인증 (Gmail, Facebook)' },
      { name: 'News', description: '뉴스 기사 조회 및 본문 크롤링' },
    ],
    servers: [{ url: '/api', description: 'App Router API' }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token',
          description: 'NextAuth 세션 쿠키 (로그인 후 자동 포함)',
        },
      },
      schemas: {
        Flow: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            isActive: { type: 'boolean' },
            userId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        FlowDetail: {
          allOf: [
            { $ref: '#/components/schemas/Flow' },
            {
              type: 'object',
              properties: {
                definition: {
                  type: 'object',
                  description: '플로우 노드 정의 JSON',
                },
              },
            },
          ],
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            provider: { type: 'string', enum: ['ANTHROPIC', 'OPENAI', 'GEMINI'] },
            label: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ExternalToken: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            provider: { type: 'string', enum: ['GMAIL', 'FACEBOOK'] },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        BrandKit: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            logoUrl: { type: 'string', nullable: true },
            primaryColor: { type: 'string', nullable: true },
            secondaryColor: { type: 'string', nullable: true },
            fontFamily: { type: 'string', nullable: true },
            tone: { type: 'string', nullable: true },
            feeling: { type: 'string', nullable: true },
          },
        },
        NewsArticle: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '기사 제목' },
            articleUrl: { type: 'string', format: 'uri', description: '기사 URL' },
            summary: { type: 'string', description: '요약 (최대 150자)' },
            press: { type: 'string', description: '언론사' },
            pubDate: { type: 'string', format: 'date', description: '발행일 (YYYY-MM-DD)' },
            pubDateRaw: { type: 'string', description: 'RSS 원본 발행일 문자열' },
          },
        },
        NewsRSSItem: {
          type: 'object',
          description: 'Google News RSS 기사 항목',
          properties: {
            title: { type: 'string', description: '기사 제목' },
            link: { type: 'string', format: 'uri', description: '기사 URL' },
            pubDate: { type: 'string', description: 'RSS 발행일' },
            description: { type: 'string', description: '기사 설명' },
            source: { type: 'string', description: '언론사' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ sessionCookie: [] }],
    paths: {
      // swagger.ts의 paths 안에 추가
      '/news': {
        get: {
          summary: '뉴스 기사 목록 조회',
          tags: ['News'],
          security: [],
          parameters: [
            {
              in: 'query',
              name: 'query',
              required: true,
              schema: { type: 'string' },
              description: '검색어',
            },
            {
              in: 'query',
              name: 'date',
              schema: { type: 'string', nullable: true },
              description: '날짜 (YYYY-MM-DD)',
            },
          ],
          responses: {
            200: {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string', description: '검색어' },
                      date: { type: 'string', nullable: true, description: '날짜 (YYYY-MM-DD)' },
                      total: { type: 'integer', description: '총 기사 수' },
                      items: { type: 'array', items: { $ref: '#/components/schemas/NewsRSSItem' } },
                    },
                  },
                },
              },
            },
            400: {
              description: 'query 파라미터 누락',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
            500: {
              description: '서버 오류',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
          },
        },
      },
      '/news/article': {
        get: {
          summary: '뉴스 기사 본문 크롤링',
          tags: ['News'],
          security: [],
          parameters: [
            {
              in: 'query',
              name: 'url',
              required: true,
              schema: { type: 'string', format: 'uri' },
              description: '기사 URL',
            },
          ],
          responses: {
            200: {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', format: 'uri', description: '실제 기사 URL' },
                      title: { type: 'string', description: '기사 제목' },
                      description: { type: 'string', description: 'og:description' },
                      image: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        description: 'og:image',
                      },
                      body: { type: 'string', description: '본문 텍스트' },
                      publishedAt: { type: 'string', nullable: true, description: '발행일' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'url 파라미터 누락 또는 디코딩 실패',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
            500: {
              description: '서버 오류',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
          },
        },
      },
    },
  },
  apis: [path.join(process.cwd(), 'src/app/api/**/*.ts')],
}

export function getSwaggerSpec() {
  return swaggerJsdoc(options)
}
