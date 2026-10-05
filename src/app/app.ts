import { Component } from '@angular/core';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';
import { Page } from './layout/page/page';

@Component({
  imports: [Footer, Header, Page],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
