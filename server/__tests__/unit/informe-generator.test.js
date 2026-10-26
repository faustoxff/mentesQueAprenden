process.env.OPENROUTER_API_KEY = 'test';
const mockCreate = jest.fn();
jest.mock('openai', () => jest.fn().mockImplementation(() => ({ chat: { completions: { create: (...a) => mockCreate(...a) } } })));

const { generarInformeTexto } = require('../../src/services/informeGenerator');

const evaluacion = { paciente: { nombre: 'A', apellido: 'B' }, pruebas: [] };

describe('generarInformeTexto: respuestas raras de OpenRouter', () => {
  test.each([
    ['sin choices (error embebido)', { error: { message: 'saturado' } }],
    ['contenido vacío', { choices: [{ message: { content: '   ' } }] }],
    ['contenido nulo', { choices: [{ message: { content: null } }] }]
  ])('%s → error 502 claro, no un TypeError', async (_n, respuesta) => {
    mockCreate.mockResolvedValue(respuesta);
    await expect(generarInformeTexto(evaluacion)).rejects.toMatchObject({ status: 502 });
  });

  test('con contenido devuelve el texto sin espacios sobrantes', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '  Informe listo  ' } }] });
    await expect(generarInformeTexto(evaluacion)).resolves.toBe('Informe listo');
  });
});
