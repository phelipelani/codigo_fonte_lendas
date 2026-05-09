<?php
/**
 * Classe de Erro HTTP Personalizado
 * Arquivo: src/utils/HttpError.php
 */

class HttpError extends Exception {
    private $statusCode;
    private $errors; // Detalhes adicionais (ex: campos inválidos)
    
    public function __construct($message, $statusCode = 500, $errors = []) {
        // Passa a mensagem e o código para a classe Exception padrão do PHP
        parent::__construct($message, $statusCode);
        
        $this->statusCode = $statusCode;
        $this->errors = $errors;
    }
    
    // Getter explícito para o status HTTP
    public function getStatusCode() {
        return $this->statusCode;
    }
    
    // Getter para erros detalhados
    public function getErrors() {
        return $this->errors;
    }
    
    // Formata o erro para resposta JSON
    public function toArray() {
        $response = [
            'error' => true,
            'message' => $this->getMessage(), // Mensagem principal
            'code' => $this->statusCode
        ];
        
        if (!empty($this->errors)) {
            $response['details'] = $this->errors;
        }
        
        return $response;
    }
}
// A função 'errorHandler' foi REMOVIDA daqui para evitar o erro "Cannot redeclare".
// Quem cuida da resposta agora é o index.php.