import OpenAI from 'openai'
import { buildStockAnalysisPrompt } from '@/lib/llm/buildStockAnalysisPrompt'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

type GenerateReportInput = Parameters<typeof buildStockAnalysisPrompt>[0]

export async function generateStockReport(input: GenerateReportInput) {
    const prompt = buildStockAnalysisPrompt(input)

    const response = await openai.responses.create({
        model: 'gpt-4o-mini',
        input: [
            {
                role: 'developer',
                content: [
                    {
                        type: 'input_text',
                        text:
                            'You are a careful stock analysis assistant. ' +
                            'Use only the provided data. Do not fabricate missing values. ' +
                            'Do not provide personalized financial advice.',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: prompt,
                    },
                ],
            },
        ],
    })

    return response.output_text?.trim() || 'No report was generated.'
}