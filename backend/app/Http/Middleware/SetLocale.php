<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $supported = ['pt', 'en'];
        $rawHeader = (string) $request->header('Accept-Language', 'pt');
        $primary = strtolower(substr(trim($rawHeader), 0, 2));

        App::setLocale(in_array($primary, $supported, true) ? $primary : 'pt');

        return $next($request);
    }
}
