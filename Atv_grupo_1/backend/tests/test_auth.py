"""US01 — Autenticação: cadastro, login, token JWT e perfis."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from jose import jwt

from apoio import Cabecalho, dados_cadastro
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Usuario
from app.scripts.promover_admin import promover


def test_cadastro_normaliza_email_cpf_e_telefone(client: TestClient) -> None:
    resposta = client.post(
        "/auth/register",
        json=dados_cadastro("Ana@Teste.COM", "123.456.789-01"),
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["email"] == "ana@teste.com"
    assert corpo["cpf"] == "12345678901"
    assert corpo["telefone"] == "21999990000"
    assert corpo["perfil"] == "usuario"
    assert "senha" not in corpo and "senha_hash" not in corpo


def test_cadastro_guarda_senha_com_hash(client: TestClient) -> None:
    client.post("/auth/register", json=dados_cadastro("a@a.com", "12345678901"))

    with SessionLocal() as db:
        usuario = db.query(Usuario).filter_by(email="a@a.com").one()

    assert usuario.senha_hash != "senha1234"
    assert usuario.senha_hash.startswith("$argon2")


def test_cadastro_recusa_email_repetido_sem_diferenciar_maiusculas(
    client: TestClient,
) -> None:
    client.post("/auth/register", json=dados_cadastro("a@a.com", "12345678901"))
    resposta = client.post(
        "/auth/register", json=dados_cadastro("A@A.com", "98765432100")
    )

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Já existe um usuário com este e-mail."


def test_cadastro_recusa_cpf_repetido(client: TestClient) -> None:
    client.post("/auth/register", json=dados_cadastro("a@a.com", "12345678901"))
    resposta = client.post(
        "/auth/register", json=dados_cadastro("b@b.com", "123.456.789-01")
    )

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Já existe um usuário com este CPF."


def test_cadastro_recusa_cpf_invalido(client: TestClient) -> None:
    resposta = client.post(
        "/auth/register", json=dados_cadastro("a@a.com", "1234567890a")
    )

    assert resposta.status_code == 422
    assert resposta.json()["detail"] == "CPF deve conter 11 dígitos."


def test_cadastro_recusa_telefone_invalido(client: TestClient) -> None:
    resposta = client.post(
        "/auth/register",
        json=dados_cadastro("a@a.com", "12345678901", telefone="123456789"),
    )

    assert resposta.status_code == 422


def test_cadastro_recusa_senhas_diferentes(client: TestClient) -> None:
    resposta = client.post(
        "/auth/register",
        json=dados_cadastro("a@a.com", "12345678901", confirmar_senha="outra123"),
    )

    assert resposta.status_code == 422


def test_cadastro_recusa_senha_curta(client: TestClient) -> None:
    resposta = client.post(
        "/auth/register",
        json=dados_cadastro(
            "a@a.com", "12345678901", senha="curta", confirmar_senha="curta"
        ),
    )

    assert resposta.status_code == 422


def test_login_devolve_token_e_dados_do_usuario(client: TestClient) -> None:
    client.post("/auth/register", json=dados_cadastro("a@a.com", "12345678901"))
    resposta = client.post(
        "/auth/login", json={"email": "A@a.com", "senha": "senha1234"}
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["token_type"] == "bearer"
    assert corpo["access_token"]
    assert corpo["usuario"]["email"] == "a@a.com"


def test_login_recusa_senha_errada_e_email_inexistente(
    client: TestClient,
) -> None:
    client.post("/auth/register", json=dados_cadastro("a@a.com", "12345678901"))

    for dados in (
        {"email": "a@a.com", "senha": "errada123"},
        {"email": "naoexiste@a.com", "senha": "senha1234"},
    ):
        resposta = client.post("/auth/login", json=dados)
        assert resposta.status_code == 401
        assert resposta.json()["detail"] == "E-mail ou senha inválidos."


def test_login_recusa_usuario_inativo(client: TestClient) -> None:
    client.post("/auth/register", json=dados_cadastro("a@a.com", "12345678901"))
    with SessionLocal() as db:
        db.query(Usuario).filter_by(email="a@a.com").update({"ativo": False})
        db.commit()

    resposta = client.post(
        "/auth/login", json={"email": "a@a.com", "senha": "senha1234"}
    )

    assert resposta.status_code == 403


def test_me_devolve_o_usuario_logado(
    client: TestClient, atleta: Cabecalho
) -> None:
    resposta = client.get("/auth/me", headers=atleta)

    assert resposta.status_code == 200
    assert resposta.json()["email"] == "atleta@teste.com"


def test_me_sem_token_responde_401(client: TestClient) -> None:
    resposta = client.get("/auth/me")

    assert resposta.status_code == 401
    assert resposta.headers["www-authenticate"] == "Bearer"


def test_me_recusa_token_invalido(client: TestClient) -> None:
    resposta = client.get("/auth/me", headers={"Authorization": "Bearer lixo"})

    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Sessão inválida ou expirada."


def test_me_recusa_token_expirado(client: TestClient, atleta: Cabecalho) -> None:
    expirado = jwt.encode(
        {
            "sub": "1",
            "perfil": "usuario",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    resposta = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {expirado}"}
    )

    assert resposta.status_code == 401


def test_me_recusa_token_assinado_com_outra_chave(
    client: TestClient, atleta: Cabecalho
) -> None:
    falso = jwt.encode(
        {
            "sub": "1",
            "perfil": "administrador",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        "chave-de-outra-pessoa",
        algorithm=settings.JWT_ALGORITHM,
    )

    resposta = client.get("/auth/me", headers={"Authorization": f"Bearer {falso}"})

    assert resposta.status_code == 401


def test_token_de_usuario_inativado_deixa_de_valer(
    client: TestClient, atleta: Cabecalho
) -> None:
    with SessionLocal() as db:
        db.query(Usuario).filter_by(email="atleta@teste.com").update(
            {"ativo": False}
        )
        db.commit()

    assert client.get("/auth/me", headers=atleta).status_code == 401


def test_rota_de_admin_recusa_atleta_e_aceita_administrador(
    client: TestClient, atleta: Cabecalho, admin: Cabecalho
) -> None:
    assert client.get("/admin/quadras").status_code == 401
    assert client.get("/admin/quadras", headers=atleta).status_code == 403
    assert client.get("/admin/quadras", headers=admin).status_code == 200


def test_promover_admin_vale_sem_novo_login(
    client: TestClient, atleta: Cabecalho
) -> None:
    # O perfil é lido do banco a cada pedido, não do token.
    assert client.get("/admin/quadras", headers=atleta).status_code == 403

    assert promover("atleta@teste.com") == 0

    assert client.get("/admin/quadras", headers=atleta).status_code == 200


def test_promover_admin_com_email_inexistente(client: TestClient) -> None:
    assert promover("ninguem@teste.com") == 1


def test_login_do_admin_informa_o_perfil(
    client: TestClient, admin: Cabecalho
) -> None:
    resposta = client.post(
        "/auth/login", json={"email": "admin@teste.com", "senha": "senha1234"}
    )

    assert resposta.json()["usuario"]["perfil"] == "administrador"


def test_cadastro_recusa_cpf_com_digitos_unicode(client: TestClient) -> None:
    client.post("/auth/register", json=dados_cadastro("a@a.com", "12345678901"))

    for cpf_unicode in ("１２３４５６７８９０１", "1234567890١"):
        resposta = client.post(
            "/auth/register", json=dados_cadastro("b@b.com", cpf_unicode)
        )
        assert resposta.status_code == 422
        assert resposta.json()["detail"] == "CPF deve conter apenas dígitos ASCII."

def test_atualizar_perfil_do_atleta(
    client: TestClient, atleta: Cabecalho
) -> None:
    resposta = client.patch(
        "/auth/me",
        json={
            "nome": "  Gustavo Morais Atualizado  ",
            "telefone": "(12) 99123-4567",
            "cidade": "São José dos Campos",
        },
        headers=atleta,
    )

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["nome"] == "Gustavo Morais Atualizado"
    assert dados["telefone"] == "12991234567"
    assert dados["cidade"] == "São José dos Campos"


def test_atualizar_perfil_recusa_telefone_invalido(
    client: TestClient, atleta: Cabecalho
) -> None:
    resposta = client.patch(
        "/auth/me",
        json={
            "nome": "Atleta Teste",
            "telefone": "123456789",
            "cidade": "Caçapava",
        },
        headers=atleta,
    )

    assert resposta.status_code == 422


def test_alterar_senha_do_atleta(
    client: TestClient, atleta: Cabecalho
) -> None:
    erro_atual = client.patch(
        "/auth/me/senha",
        json={
            "senha_atual": "senha_errada",
            "nova_senha": "novaSenha123",
            "confirmar_nova_senha": "novaSenha123",
        },
        headers=atleta,
    )
    assert erro_atual.status_code == 422
    assert erro_atual.json()["detail"] == "Senha atual incorreta."

    ok = client.patch(
        "/auth/me/senha",
        json={
            "senha_atual": "senha1234",
            "nova_senha": "novaSenha123",
            "confirmar_nova_senha": "novaSenha123",
        },
        headers=atleta,
    )
    assert ok.status_code == 204

    login_novo = client.post(
        "/auth/login",
        json={"email": "atleta@teste.com", "senha": "novaSenha123"},
    )
    assert login_novo.status_code == 200

def test_refresh_renova_token_valido(client: TestClient, atleta: Cabecalho) -> None:
    original = atleta["Authorization"].split()[1]
    dados = jwt.get_unverified_claims(original)
    dados["exp"] = datetime.now(timezone.utc) + timedelta(minutes=4)
    quase_expirado = jwt.encode(
        dados, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    resposta = client.post(
        "/auth/refresh", headers={"Authorization": f"Bearer {quase_expirado}"}
    )
    assert resposta.status_code == 200
    novo = resposta.json()["access_token"]
    claims = jwt.decode(novo, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert novo != original
    assert claims["sub"] == dados["sub"]
    assert claims["sid"] == dados["sid"]
    assert claims["exp"] > jwt.get_unverified_claims(quase_expirado)["exp"]
    assert resposta.json()["usuario"]["email"] == "atleta@teste.com"
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {novo}"}).status_code == 200


def test_refresh_recusa_token_invalido_ou_expirado(client: TestClient, atleta: Cabecalho) -> None:
    dados = jwt.get_unverified_claims(atleta["Authorization"].split()[1])
    dados["exp"] = datetime.now(timezone.utc) - timedelta(minutes=1)
    expirado = jwt.encode(dados, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    falso = jwt.encode(dados, "outra-chave", algorithm=settings.JWT_ALGORITHM)
    for headers in ({}, {"Authorization": "Bearer lixo"},
                    {"Authorization": f"Bearer {expirado}"},
                    {"Authorization": f"Bearer {falso}"}):
        assert client.post("/auth/refresh", headers=headers).status_code == 401


def test_refresh_recusa_usuario_inativo(client: TestClient, atleta: Cabecalho) -> None:
    with SessionLocal() as db:
        db.query(Usuario).filter_by(email="atleta@teste.com").update({"ativo": False})
        db.commit()
    assert client.post("/auth/refresh", headers=atleta).status_code == 401


def test_refresh_usa_perfil_atual_do_banco(client: TestClient, atleta: Cabecalho) -> None:
    assert promover("atleta@teste.com") == 0
    resposta = client.post("/auth/refresh", headers=atleta)
    assert resposta.status_code == 200
    assert resposta.json()["usuario"]["perfil"] == "administrador"
