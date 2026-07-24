import { Routes } from '@angular/router';
import { GameShellComponent } from './ui/game-shell.component';

export const routes: Routes = [
  { path: '', component: GameShellComponent },
  { path: '**', redirectTo: '' },
];
