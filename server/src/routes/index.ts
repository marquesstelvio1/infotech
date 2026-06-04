import { Router } from "express";
import { login, registro, listarUtilizadores, atualizarUtilizador } from "../controllers/authController";
import { listarProdutos, obterProduto, criarProduto, atualizarProduto, eliminarProduto } from "../controllers/produtosController";
import { listarVendas, obterVenda, criarVenda } from "../controllers/vendasController";
import { getResumoFinanceiro, topProdutos } from "../controllers/financeController";
import multer from "multer";
import path from "path";
import fs from "fs";
import { listarMovimentos, movimentosPorProduto, criarMovimento } from "../controllers/movimentosController";
import { autenticar, apenasAdmin, apenasDev, apenasVendedor } from "../middlewares/auth";

const router = Router();

// ─── Auth ───────────────────────────────
router.post("/auth/login", login);
router.post("/auth/registro", autenticar, apenasAdmin, registro);
router.get("/utilizadores", autenticar, apenasAdmin, listarUtilizadores);
router.put("/utilizadores/:id", autenticar, apenasAdmin, atualizarUtilizador);

// ─── Produtos ───────────────────────────
router.get   ("/produtos",      autenticar, apenasVendedor, listarProdutos);
router.get   ("/produtos/:id",  autenticar, apenasVendedor, obterProduto);
router.post  ("/produtos",      autenticar, apenasAdmin,    criarProduto);
router.put   ("/produtos/:id",  autenticar, apenasAdmin,    atualizarProduto);
router.delete("/produtos/:id",  autenticar, apenasAdmin, eliminarProduto);

// Upload de imagens de produto (multipart/form-data, field 'image')
const upload = multer({ storage: multer.memoryStorage() });
router.post("/produtos/:id/image", autenticar, apenasAdmin, upload.single("image"), async (req, res) => {
	try {
		const { id } = req.params;
		const file = (req as any).file;
		if (!file) return res.status(400).json({ erro: "Ficheiro não fornecido" });

		const publicDir = path.join(__dirname, "..", "..", "public", "assets", "products");
		fs.mkdirSync(publicDir, { recursive: true });
		const outPath = path.join(publicDir, `${id}.jpg`);
		fs.writeFileSync(outPath, file.buffer);
		return res.json({ mensagem: "Imagem enviada" });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ erro: "Falha ao guardar imagem" });
	}
});

// Download remote image by URL and save as product image
router.post("/produtos/:id/fetch-image", autenticar, apenasAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const { url } = req.body as { url?: string };
		if (!url) return res.status(400).json({ erro: "URL não fornecida" });

		// fetch remote image
		const response = await fetch(url, { method: 'GET' } as any);
		if (!response.ok) return res.status(400).json({ erro: "Falha ao obter a imagem remota" });

		const contentType = response.headers.get('content-type') || '';
		if (!contentType.startsWith('image/')) return res.status(400).json({ erro: "URL não aponta para uma imagem" });

		const buffer = Buffer.from(await response.arrayBuffer());

		const publicDir = path.join(__dirname, "..", "..", "public", "assets", "products");
		fs.mkdirSync(publicDir, { recursive: true });
		const outPath = path.join(publicDir, `${id}.jpg`);
		fs.writeFileSync(outPath, buffer);
		return res.json({ mensagem: "Imagem obtida e guardada" });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ erro: "Falha ao baixar/guardar imagem" });
	}
});

// ─── Vendas ─────────────────────────────
router.get ("/vendas",     autenticar, apenasVendedor, listarVendas);
router.get ("/vendas/:id", autenticar, apenasVendedor, obterVenda);
router.post("/vendas",     autenticar, apenasVendedor, criarVenda);

// Finanças (apenas admins)
router.get("/finance/resumo", autenticar, apenasAdmin, getResumoFinanceiro);
router.get("/finance/top-products", autenticar, apenasAdmin, topProdutos);
router.get("/finance/export-pdf", autenticar, apenasAdmin, (req, res) => import("../controllers/financeController").then(m => m.exportFinancePdf(req, res)));

// ─── Movimentos ─────────────────────────
router.get ("/movimentos",                       autenticar, apenasAdmin, listarMovimentos);
router.get ("/movimentos/produto/:produtoId",    autenticar, apenasAdmin, movimentosPorProduto);
router.post("/movimentos",                       autenticar, apenasAdmin, criarMovimento);


export default router;